/**
 * Kafka produce→consume integration test.
 *
 * Verifies that KafkaLiveTransport round-trips a real MatchEvent through a live
 * Apache Kafka broker: publish() produces to the topic, and the transport's
 * consumer delivers the SAME event back to a subscribed listener.
 *
 * Requires a running broker. Skips automatically when KAFKA_BROKERS is unset so
 * `pnpm test` / CI (zero-infra) stay green. Run it against the dockerized broker:
 *   docker compose up -d kafka
 *   KAFKA_BROKERS=localhost:29092 pnpm --filter @matchora/data exec vitest run \
 *     src/__tests__/kafkaTransport.integration.test.ts
 */

import { afterAll, describe, expect, it } from 'vitest';
import type { MatchEvent } from '@matchora/shared';
import { KafkaLiveTransport } from '../live/kafkaTransport.js';

const brokers = (process.env.KAFKA_BROKERS ?? '')
  .split(',')
  .map((b) => b.trim())
  .filter(Boolean);

const runIntegration = brokers.length > 0 ? describe : describe.skip;

function sampleEvent(fixtureId: string, seq: number): MatchEvent {
  return {
    eventId: `it-${fixtureId}-${seq}`,
    fixtureId,
    sequence: seq,
    kind: 'goal',
    matchClock: 23,
    side: 'home',
    teamId: 'team-x',
    playerId: null,
    payload: {},
    emittedAt: new Date().toISOString(),
    source: 'integration-test',
    externalId: null,
    correctionOf: null,
  };
}

runIntegration('KafkaLiveTransport (integration)', () => {
  // unique topic per run so partition assignment never races a stale offset
  const topic = `match-events-it-${Date.now()}`;
  const transport = new KafkaLiveTransport({
    brokers,
    clientId: 'matchora-it',
    topic,
    groupSuffix: `it-${process.pid}`,
  });

  afterAll(async () => {
    await transport.stop();
  });

  it(
    'round-trips a published match event back to a subscribed listener',
    async () => {
      const fixtureId = 'it-fixture-1';
      await transport.start(); // creates topic + connects producer & consumer

      const received: MatchEvent[] = [];
      transport.subscribe(`fixture:${fixtureId}`, (e) => received.push(e));

      // Produce repeatedly until the consumer (post group-join) delivers it,
      // tolerating partition-assignment latency. Bounded so failure is visible.
      const deadline = Date.now() + 25_000;
      let seq = 0;
      while (received.length === 0 && Date.now() < deadline) {
        seq += 1;
        transport.publish(`fixture:${fixtureId}`, sampleEvent(fixtureId, seq));
        await new Promise((r) => setTimeout(r, 800));
      }

      expect(received.length).toBeGreaterThan(0);
      const got = received[0]!;
      expect(got.fixtureId).toBe(fixtureId);
      expect(got.kind).toBe('goal');
      expect(got.source).toBe('integration-test');
    },
    35_000,
  );
});
