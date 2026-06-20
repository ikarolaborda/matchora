import {
  serializeSse,
  parseResumeCursor,
  type LiveMessage,
  type MatchEvent,
} from '@matchora/shared';
import { getMockProvider, getHub, ensureSimulationRunning } from '@matchora/data';
import { errorResponse } from '@/lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEARTBEAT_MS = 15_000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  const { fixtureId } = await params;

  // Ensure the in-process ticker is running so live matches advance.
  ensureSimulationRunning();

  const provider = getMockProvider();
  const subscription = provider.subscribeToMatchEvents(fixtureId);
  if (!subscription) {
    return errorResponse('not_found', `Fixture ${fixtureId} not found`, 404);
  }

  const hub = getHub();
  const cursor = parseResumeCursor(request.headers.get('Last-Event-ID'));

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (message: LiveMessage) => {
        if (closed) return;
        controller.enqueue(encoder.encode(serializeSse(message)));
      };

      // Resume or fresh snapshot.
      const snapshot = subscription.snapshot();
      if (cursor !== null) {
        const replayed = hub.replay(fixtureId, cursor);
        if (replayed === null) {
          // Stale cursor → fresh snapshot, then continue live.
          send({ type: 'snapshot', fixtureId, sequence: snapshot.lastSequence, snapshot });
        } else {
          // Valid cursor → re-send current snapshot baseline then buffered events.
          send({ type: 'snapshot', fixtureId, sequence: snapshot.lastSequence, snapshot });
          for (const ev of replayed) {
            send({ type: 'event', event: ev });
          }
        }
      } else {
        send({ type: 'snapshot', fixtureId, sequence: snapshot.lastSequence, snapshot });
      }

      const unsubscribe = hub.subscribe(fixtureId, (event: MatchEvent) => {
        send({ type: 'event', event });
      });

      const heartbeat = setInterval(() => {
        send({ type: 'heartbeat', at: new Date().toISOString() });
      }, HEARTBEAT_MS);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
