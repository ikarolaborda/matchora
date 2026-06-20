/**
 * Minimal, dependency-free structured logger.
 *
 * Emits one JSON object per line to stdout/stderr so it can be ingested by any
 * log pipeline (Vercel, Loki, CloudWatch, Datadog, etc.) without a transport.
 * Levels are filtered by LOG_LEVEL (default: 'info'). In development the output
 * is the same JSON — keep it greppable rather than pretty.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveThreshold(): number {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  if (raw in LEVEL_WEIGHT) {
    return LEVEL_WEIGHT[raw as LogLevel];
  }
  return LEVEL_WEIGHT.info;
}

/** Structured fields attached to a log line. Values must be JSON-serializable. */
export type LogFields = Record<string, unknown>;

function emit(level: LogLevel, message: string, fields?: LogFields): void {
  if (LEVEL_WEIGHT[level] < resolveThreshold()) {
    return;
  }

  const line: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...fields,
  };

  let serialized: string;
  try {
    serialized = JSON.stringify(line);
  } catch {
    // Guard against circular references / unserializable fields.
    serialized = JSON.stringify({
      level,
      time: line.time,
      msg: message,
      serializationError: true,
    });
  }

  if (level === 'error' || level === 'warn') {
    // eslint-disable-next-line no-console
    console.error(serialized);
  } else {
    // eslint-disable-next-line no-console
    console.log(serialized);
  }
}

export const logger = {
  debug: (message: string, fields?: LogFields) => emit('debug', message, fields),
  info: (message: string, fields?: LogFields) => emit('info', message, fields),
  warn: (message: string, fields?: LogFields) => emit('warn', message, fields),
  error: (message: string, fields?: LogFields) => emit('error', message, fields),
};

export type Logger = typeof logger;
