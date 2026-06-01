import pino from 'pino';
import { env } from '#trlab/modules/configs/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard'
        }
      }
    : undefined
});

export function childLogger(bindings) {
  return logger.child(bindings);
}
