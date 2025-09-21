import pino from 'pino';
import { loadEnv } from './env';

const env = loadEnv();

export const logger = pino({
  level: env.LOG_LEVEL,
  base: undefined, // omit pid, hostname for lean logs
  timestamp: pino.stdTimeFunctions.isoTime,
  messageKey: 'message'
});

export function withRequestContext<T extends object>(context: T) {
  return logger.child({ ...context });
}
