/**
 * KafkaLiveTransport — a LiveTransport backed by Apache Kafka (KafkaJS).
 *
 * Realizes the reference design's event bus: match events are produced to the
 * `match-events` topic keyed by fixtureId (per-fixture ordering via the
 * partition key) and consumed back to drive in-process listeners. This lets the
 * SSE fanout span multiple web processes.
 *
 * Fail-open: construction never throws and never blocks app startup. The
 * producer/consumer connect in the background; if Kafka is unreachable, the
 * caller falls back to the in-memory transport (see factory). Each process uses
 * a UNIQUE consumer group so every web instance BROADCASTS (does not
 * load-balance) live events to its own SSE clients.
 */

import type { MatchEvent } from '@matchora/shared';
import { Kafka, logLevel, type Admin, type Consumer, type Producer } from 'kafkajs';
import type { LiveTransport } from './hub.js';

export interface KafkaTransportConfig {
  brokers: string[];
  clientId: string;
  topic: string;
  /** Stable-ish per-process suffix to keep consumer groups unique (broadcast). */
  groupSuffix?: string;
}

export class KafkaLiveTransport implements LiveTransport {
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private readonly consumer: Consumer;
  private readonly listeners = new Map<string, Set<(event: MatchEvent) => void>>();
  private started = false;

  constructor(private readonly config: KafkaTransportConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      logLevel: logLevel.NOTHING,
      retry: { retries: 3 },
    });
    this.producer = this.kafka.producer({ allowAutoTopicCreation: true });
    const group = `${config.clientId}-sse-${config.groupSuffix ?? `${Date.now()}`}`;
    this.consumer = this.kafka.consumer({ groupId: group, allowAutoTopicCreation: true });
  }

  /** Connect producer + consumer and begin dispatching to listeners. */
  async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;
    // Ensure the topic exists before the consumer subscribes — relying on
    // broker auto-create races the consumer ("topic-partition not hosted yet").
    const admin: Admin = this.kafka.admin();
    try {
      await admin.connect();
      await admin.createTopics({
        topics: [{ topic: this.config.topic, numPartitions: 3, replicationFactor: 1 }],
        waitForLeaders: true,
      });
    } finally {
      await admin.disconnect().catch(() => undefined);
    }
    await this.producer.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.config.topic, fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) {
          return;
        }
        let event: MatchEvent;
        try {
          event = JSON.parse(message.value.toString()) as MatchEvent;
        } catch {
          return;
        }
        const channel = `fixture:${event.fixtureId}`;
        const set = this.listeners.get(channel);
        if (set) {
          for (const fn of set) {
            fn(event);
          }
        }
      },
    });
  }

  publish(_channel: string, event: MatchEvent): void {
    // fire-and-forget; key by fixtureId so a fixture's events keep ordering
    void this.producer
      .send({
        topic: this.config.topic,
        messages: [{ key: event.fixtureId, value: JSON.stringify(event) }],
      })
      .catch(() => {
        // bounded retries are configured on the client; drop on hard failure
      });
  }

  subscribe(channel: string, listener: (event: MatchEvent) => void): () => void {
    let set = this.listeners.get(channel);
    if (!set) {
      set = new Set();
      this.listeners.set(channel, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }
    await this.consumer.disconnect().catch(() => undefined);
    await this.producer.disconnect().catch(() => undefined);
    this.started = false;
  }
}
