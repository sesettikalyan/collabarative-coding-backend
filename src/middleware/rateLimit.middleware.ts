import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Rate Limiting Middleware
 *
 * Why rate limiting?
 * - Prevent brute force attacks (password guessing)
 * - Prevent denial of service (API spam)
 * - Fair resource allocation (one user can't hog server)
 * - Protect free-tier APIs (Judge0 has 50 requests/day limit)
 *
 * Simple In-Memory Strategy:
 * - Store request counts by IP/user
 * - Clear counts periodically (every minute)
 * - Lightweight, no external service needed
 * - Sufficient for development
 *
 * For production with 1000+ users:
 * - Use Redis (shared across server instances)
 * - But for MVP on single server, this works great
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store request counts in memory
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Create a rate limit middleware
 *
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @param keyGenerator - Function to generate unique key (IP, user ID, etc.)
 *
 * Example:
 * const loginLimiter = createRateLimiter(5, 15 * 60 * 1000); // 5 requests per 15 minutes
 * app.post('/api/auth/login', loginLimiter, loginHandler);
 */
export const createRateLimiter = (
  maxRequests: number = 100,
  windowMs: number = 60 * 1000, // 1 minute default
  keyGenerator?: (req: Request) => string
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Generate unique key (default: IP address)
    const key = keyGenerator ? keyGenerator(req) : req.ip || 'unknown';
    const now = Date.now();

    // Get or create entry for this key
    let entry = rateLimitStore.get(key);

    // If entry expired, reset it
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    // Increment request count
    entry.count++;

    // Add headers showing rate limit status
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', entry.resetTime);

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      const remaining = Math.ceil((entry.resetTime - now) / 1000);
      logger.warn(`Rate limit exceeded for ${key}. Retry after ${remaining}s`);

      return next(
        new RateLimitError(`Too many requests. Retry after ${remaining} seconds`)
      );
    }

    next();
  };
};

/**
 * Specific rate limiters for different endpoints
 */

// Auth endpoints: 5 attempts per 15 minutes
export const authLimiter = createRateLimiter(5, 15 * 60 * 1000);

// General API: 100 requests per minute
export const apiLimiter = createRateLimiter(100, 60 * 1000);

// Code execution: 10 requests per minute (expensive operation)
export const executionLimiter = createRateLimiter(10, 60 * 1000);

/**
 * Cleanup old entries periodically
 *
 * Why? Prevent memory leak from old IPs
 */
setInterval(() => {
  const now = Date.now();
  let cleared = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime + 60 * 1000) { // Keep entries for 1 minute after expiry
      rateLimitStore.delete(key);
      cleared++;
    }
  }

  if (cleared > 0) {
    logger.debug(`Rate limit: Cleared ${cleared} expired entries`);
  }
}, 60 * 1000); // Cleanup every minute

/**
 * Reset rate limit for a specific key (admin use)
 *
 * Example: When user successfully authenticates, clear their failed attempts
 */
export const clearRateLimit = (key: string): void => {
  rateLimitStore.delete(key);
};

/**
 * Get current rate limit status for a key
 *
 * Useful for debugging
 */
export const getRateLimitStatus = (key: string): RateLimitEntry | undefined => {
  return rateLimitStore.get(key);
};

/**
 * Usage Examples:
 *
 * 1. Protect login endpoint:
 * router.post('/login', authLimiter, loginHandler);
 *
 * 2. Protect all API routes:
 * app.use('/api/', apiLimiter);
 *
 * 3. Protect expensive operations:
 * router.post('/execute', executionLimiter, executeHandler);
 *
 * 4. Custom limiter with user ID as key:
 * const userLimiter = createRateLimiter(1000, 60 * 1000, (req) => {
 *   return req.user?.id || req.ip;
 * });
 */
