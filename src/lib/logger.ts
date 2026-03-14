/**
 * Structured JSON logger for request/operation visibility.
 * One JSON object per line so logs are queryable (e.g. grep, log aggregators).
 */

type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, fields?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...fields,
  };
  console.log(JSON.stringify(payload));
}

export const logger = {
  info(message: string, fields?: Record<string, unknown>) {
    log("info", message, fields);
  },
  warn(message: string, fields?: Record<string, unknown>) {
    log("warn", message, fields);
  },
  error(message: string, fields?: Record<string, unknown>) {
    log("error", message, fields);
  },
};
