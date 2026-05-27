import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';
import { extractTokenFromHeader, verifyToken, TokenPayload } from '../utils/jwt.js';
import logger from '../utils/logger.js';

/**
 * JWT Authentication Middleware
 *
 * Purpose: Verify JWT token on protected routes
 *
 * How it works:
 * 1. Extract token from Authorization header ("Bearer <token>")
 * 2. Verify token signature and expiration
 * 3. Decode user info from token
 * 4. Attach user to req.user
 * 5. Route handler can access req.user
 *
 * Usage:
 * router.get('/profile', requireAuth, profileController);
 */

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware: Verify JWT token
 *
 * Throws AuthenticationError (401) if:
 * - No token provided
 * - Token invalid or expired
 *
 * Continues if token valid
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      logger.warn('Missing authorization token');
      throw new AuthenticationError('Missing authorization token');
    }

    // Verify token (throws if invalid/expired)
    const payload = verifyToken(token);

    // Attach user to request object
    // Now route handler can use req.user
    req.user = payload;

    next();
  } catch (error) {
    // If it's already our custom error, pass it
    if (error instanceof AuthenticationError) {
      return next(error);
    }

    // Convert other errors to authentication error
    logger.warn('Token verification failed:', error);
    next(new AuthenticationError('Invalid token'));
  }
};

/**
 * Optional: Verify JWT token but don't require it
 *
 * Useful for routes that work both logged-in and logged-out
 * Example: Public room with optional user data
 *
 * Usage:
 * router.get('/rooms/:id', optionalAuth, getRoomHandler);
 * // req.user will exist if authenticated, undefined otherwise
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const payload = verifyToken(token);
      req.user = payload;
    }

    // Continue regardless of token
    next();
  } catch (error) {
    logger.debug('Optional token verification failed:', error);
    // Silently continue without user
    next();
  }
};

/**
 * Middleware: Require specific role/permission
 *
 * Example: Only room owner can delete room
 *
 * Usage:
 * router.delete('/rooms/:id',
 *   requireAuth,
 *   requireRole('owner'),
 *   deleteRoomController
 * );
 *
 * We'll implement this in Phase 3 when we have roles
 */
export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // For now, just a placeholder
    // Phase 3 will add actual role checking
    next();
  };
};

/**
 * Full Example - Protected Route:
 *
 * routes/user.ts:
 * ─────────────────
 * router.get('/profile', requireAuth, userController.getProfile);
 *
 * controller:
 * ──────────
 * async getProfile(req, res, next) {
 *   try {
 *     // req.user exists because middleware verified it
 *     const userId = req.user!.userId; // ! = we know it exists
 *
 *     const user = await userService.getUserProfile(userId);
 *     res.json({ success: true, data: user });
 *   } catch (err) {
 *     next(err);
 *   }
 * }
 *
 * What happens:
 * ──────────────
 * Client with valid token:
 * Headers: { Authorization: "Bearer eyJhbGci..." }
 * ✓ Middleware verifies token
 * ✓ req.user set to { userId, email, ... }
 * ✓ Controller runs, gets profile
 * ✓ Returns 200 with profile data
 *
 * Client without token:
 * Headers: {}
 * ✗ Middleware throws AuthenticationError
 * ✗ Error handler returns 401 Unauthorized
 * ✗ Controller never runs
 *
 * Client with invalid token:
 * Headers: { Authorization: "Bearer INVALID_TOKEN" }
 * ✗ Middleware throws AuthenticationError
 * ✗ Error handler returns 401 Unauthorized
 * ✗ Controller never runs
 */
