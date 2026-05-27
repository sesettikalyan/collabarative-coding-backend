import winston from 'winston';
import { env } from '../config/env.js';

/**
 * Winston Logger Setup
 *
 * Why Winston?
 * - Industry standard logging library
 * - Multiple transport support (console, file, etc.)
 * - Structured logging (JSON format for production)
 * - Log levels (error, warn, info, debug)
 *
 * Why structured logging?
 * - Easy to parse and index
 * - Better debugging in production
 * - Can integrate with monitoring tools
 */

const logger = winston.createLogger({
  level: env.logLevel,
  format: env.isDevelopment
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      )
    : winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
  transports: [
    // Always log to console
    new winston.transports.Console(),
    // Log errors to file (important for debugging production issues)
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // Log all in development
    ...(env.isDevelopment ? [new winston.transports.File({ filename: 'combined.log' })] : []),
  ],
});

export default logger;
