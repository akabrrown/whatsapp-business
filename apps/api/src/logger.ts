// Structured logging helper: JSON format for production observability.
// In production, logs are JSON-parseable for easy ingestion by log aggregators.

const isProduction = process.env.NODE_ENV === 'production';

export interface LogContext {
  [key: string]: unknown;
}

function formatMessage(level: string, message: string, context?: LogContext): string {
  if (isProduction) {
    return JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...context });
  }
  const ctx = context ? ` ${JSON.stringify(context)}` : '';
  return `${level.toUpperCase()} ${message}${ctx}`;
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(formatMessage('info', message, context));
  },
  warn(message: string, context?: LogContext) {
    console.warn(formatMessage('warn', message, context));
  },
  error(message: string, context?: LogContext) {
    console.error(formatMessage('error', message, context));
  },
  debug(message: string, context?: LogContext) {
    if (process.env.DEBUG) console.debug(formatMessage('debug', message, context));
  },
};
