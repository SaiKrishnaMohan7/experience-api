import pino from 'pino';

/**
 * Simple logger instance using Pino.
 *
 * NOTE: For production applications, consider using Dependency Injection:
 * - Create a Logger interface
 * - Inject logger instance into services/controllers
 * - Makes testing easier (can mock logger)
 * - Allows different logger implementations per environment
 *
 * Example DI approach:
 * ```
 * interface Logger {
 *   info(msg: string, data?: object): void;
 *   error(msg: string, error?: Error, data?: object): void;
 * }
 *
 * class CartService {
 *   constructor(private logger: Logger, ...) {}
 * }
 * ```
 */
// Use pino-pretty only in development (when it's available as devDependency)
// In production, output structured JSON logs
const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino(
  isDevelopment
    ? {
        level: process.env.LOG_LEVEL || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        level: process.env.LOG_LEVEL || 'info',
      }
);
