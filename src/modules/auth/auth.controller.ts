import { Request, Response, NextFunction } from 'express';
import authService from './auth.service.js';
import logger from '../../utils/logger.js';

/**
 * Auth Controller
 *
 * Responsibility: Handle HTTP requests/responses
 *
 * Flow:
 * Request → Validation Middleware → Controller → Service → Response
 *
 * Controller job: NOT business logic!
 * - Extract data from request
 * - Call service
 * - Format response
 * - Handle HTTP status codes
 */

class AuthController {
  /**
   * Register endpoint
   *
   * POST /api/auth/register
   * Body: { email, username, password, confirmPassword }
   * Response: 201 Created { success, user, token }
   *
   * Flow:
   * 1. Middleware validates input (validateRequest)
   * 2. This handler called with validated data
   * 3. Call authService.register()
   * 4. Return 201 with user + token
   * 5. If error → error middleware handles it
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Middleware already validated this data
      // req.body contains: email, username, password, confirmPassword
      const result = await authService.register(req.body);

      logger.info(`Register endpoint: User registered successfully`);

      // 201 Created = Resource successfully created
      res.status(201).json(result);
    } catch (error) {
      // Pass to Express error handler
      next(error);
    }
  }

  /**
   * Login endpoint
   *
   * POST /api/auth/login
   * Body: { email, password }
   * Response: 200 OK { success, user, token }
   *
   * Protected by: authLimiter middleware (5 requests per 15 minutes)
   *
   * Flow:
   * 1. Rate limiter checks (authLimiter middleware)
   * 2. Middleware validates input
   * 3. This handler called
   * 4. Call authService.login()
   * 5. Return 200 with user + token
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Middleware validated: email, password
      const result = await authService.login(req.body);

      logger.info(`Login endpoint: User logged in successfully`);

      // 200 OK = Success
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   *
   * GET /api/auth/me
   * Headers: Authorization: Bearer <token>
   * Response: 200 OK { success, user }
   *
   * Protected by: requireAuth middleware (JWT verification)
   *
   * Usage: Frontend calls after login to get user info
   */
  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // requireAuth middleware set req.user
      const userId = req.user?.userId;

      if (!userId) {
        return next(new Error('User not found in token'));
      }

      const user = await authService.getUserById(userId);

      if (!user) {
        return next(new Error('User no longer exists'));
      }

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout endpoint (optional)
   *
   * POST /api/auth/logout
   * Headers: Authorization: Bearer <token>
   * Response: 200 OK { success: true }
   *
   * Note: JWT tokens are stateless, so we don't need to do anything server-side
   * Frontend just deletes token from localStorage
   *
   * We can still have an endpoint for:
   * - Logging the logout event
   * - Revoking refresh tokens (when implemented)
   * - Clearing user sessions
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      logger.info(`User logged out: ${userId}`);

      // Frontend responsibility: Delete token from localStorage
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user stats (for dashboard)
   *
   * GET /api/auth/stats
   * Headers: Authorization: Bearer <token>
   * Response: 200 OK { success, stats }
   *
   * Protected by: requireAuth middleware
   *
   * Returns: User stats for dashboard display
   */
  async getUserStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return next(new Error('User not found'));
      }

      const stats = await authService.getUserStats(userId);

      res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export default new AuthController();

/**
 * HTTP Status Codes Used:
 *
 * 200 OK
 *   - Login successful
 *   - Get user successful
 *   - Logout successful
 *
 * 201 Created
 *   - Register successful (new resource created)
 *
 * 400 Bad Request
 *   - Validation failed (email format, password length, etc.)
 *   - Handled by validateRequest middleware
 *
 * 401 Unauthorized
 *   - Invalid credentials (wrong password)
 *   - Missing/invalid token
 *   - Token expired
 *   - Handled by requireAuth middleware or AuthenticationError
 *
 * 409 Conflict
 *   - Email already registered
 *   - Username already taken
 *   - Handled by authService
 *
 * 429 Too Many Requests
 *   - Rate limit exceeded (5 login attempts per 15 min)
 *   - Handled by authLimiter middleware
 *
 * 500 Internal Server Error
 *   - Unexpected error
 *   - Handled by global error handler
 */
