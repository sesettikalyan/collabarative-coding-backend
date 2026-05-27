import { Router } from 'express';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { authLimiter } from '../../middleware/rateLimit.middleware.js';
import { registerSchema, loginSchema } from '../../utils/validators.js';
import authController from './auth.controller.js';

/**
 * Auth Routes
 *
 * This file WIRES EVERYTHING TOGETHER
 *
 * Structure:
 * router.METHOD(path, middleware1, middleware2, controller)
 *
 * Execution order:
 * Request → middleware1 → middleware2 → controller → Response
 *
 * All error handling is centralized:
 * - Middleware throws error → Express catches → Global error handler
 * - Controller throws error → Express catches → Global error handler
 */

const router = Router();

/**
 * POST /api/auth/register
 *
 * Register a new user
 *
 * Body: {
 *   email: "user@example.com",
 *   username: "john_doe",
 *   password: "SecurePass123",
 *   confirmPassword: "SecurePass123"
 * }
 *
 * Response 201 Created:
 * {
 *   success: true,
 *   user: {
 *     _id: "623f...",
 *     email: "user@example.com",
 *     username: "john_doe",
 *     createdAt: "2026-05-27T18:00:00Z"
 *   },
 *   token: "eyJhbGci..."
 * }
 *
 * Response 400 Bad Request (if validation fails):
 * {
 *   success: false,
 *   message: "username must be at least 3 characters"
 * }
 *
 * Response 409 Conflict (if email/username exists):
 * {
 *   success: false,
 *   message: "Email already registered. Try logging in."
 * }
 *
 * Middleware used:
 * - validateRequest: Validates body against registerSchema
 *   → Ensures all fields valid before service is called
 */
router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  authController.register
);

/**
 * POST /api/auth/login
 *
 * Login with email and password
 *
 * Body: {
 *   email: "user@example.com",
 *   password: "SecurePass123"
 * }
 *
 * Response 200 OK:
 * {
 *   success: true,
 *   user: {
 *     _id: "623f...",
 *     email: "user@example.com",
 *     username: "john_doe",
 *     createdAt: "2026-05-27T18:00:00Z",
 *     lastLoginAt: "2026-05-27T18:05:00Z"
 *   },
 *   token: "eyJhbGci..."
 * }
 *
 * Response 400 Bad Request:
 * {
 *   success: false,
 *   message: "Password must be at least 6 characters"
 * }
 *
 * Response 401 Unauthorized (wrong credentials):
 * {
 *   success: false,
 *   message: "Invalid email or password"
 * }
 *
 * Response 429 Too Many Requests (rate limited):
 * {
 *   success: false,
 *   message: "Too many requests. Retry after 120 seconds"
 * }
 *
 * Middleware used:
 * - authLimiter: Rate limiting (5 per 15 minutes)
 *   → Prevents brute force attacks
 * - validateRequest: Validates body against loginSchema
 *   → Ensures email and password format before DB query
 */
router.post(
  '/login',
  authLimiter,
  validateRequest({ body: loginSchema }),
  authController.login
);

/**
 * GET /api/auth/me
 *
 * Get current authenticated user
 *
 * Headers: Authorization: Bearer <token>
 *
 * Response 200 OK:
 * {
 *   success: true,
 *   user: {
 *     _id: "623f...",
 *     email: "user@example.com",
 *     username: "john_doe",
 *     createdAt: "2026-05-27T18:00:00Z",
 *     lastLoginAt: "2026-05-27T18:05:00Z"
 *   }
 * }
 *
 * Response 401 Unauthorized (no token or invalid token):
 * {
 *   success: false,
 *   message: "Missing authorization token"
 * }
 *
 * Middleware used:
 * - requireAuth: JWT verification
 *   → Checks token signature and expiration
 *   → Sets req.user if valid
 *   → Throws 401 if invalid
 *
 * Usage: Frontend calls this after login to refresh user info
 */
router.get('/me', requireAuth, authController.getCurrentUser);

/**
 * POST /api/auth/logout
 *
 * Logout (log the event server-side)
 *
 * Headers: Authorization: Bearer <token>
 *
 * Response 200 OK:
 * {
 *   success: true,
 *   message: "Logged out successfully"
 * }
 *
 * Note: Frontend is responsible for deleting token from localStorage
 *       Server can't "revoke" stateless JWT tokens
 *       Logout endpoint mainly for logging and future refresh token revocation
 *
 * Middleware used:
 * - requireAuth: Verify user is logged in
 */
router.post('/logout', requireAuth, authController.logout);

/**
 * GET /api/auth/stats
 *
 * Get user statistics (for dashboard)
 *
 * Headers: Authorization: Bearer <token>
 *
 * Response 200 OK:
 * {
 *   success: true,
 *   stats: {
 *     userId: "623f...",
 *     email: "user@example.com",
 *     username: "john_doe",
 *     createdAt: "2026-05-27T18:00:00Z",
 *     lastLoginAt: "2026-05-27T18:05:00Z"
 *   }
 * }
 *
 * Middleware used:
 * - requireAuth: Only authenticated users can access
 */
router.get('/stats', requireAuth, authController.getUserStats);

export default router;

/**
 * Complete Request/Response Flow Examples:
 *
 * ═════════════════════════════════════════════════════════════════
 *
 * EXAMPLE 1: Successful Registration
 * ──────────────────────────────────
 *
 * Request:
 * POST /api/auth/register
 * Content-Type: application/json
 * {
 *   "email": "alice@example.com",
 *   "username": "alice_wonder",
 *   "password": "SecurePass123",
 *   "confirmPassword": "SecurePass123"
 * }
 *
 * Processing:
 * 1. validateRequest middleware
 *    → Validate email format ✓
 *    → Validate username (alphanumeric, 3-30 chars) ✓
 *    → Validate password (6+, uppercase, numbers) ✓
 *    → Check confirmPassword matches password ✓
 *
 * 2. authController.register
 *    → Extract: email, username, password
 *    → Call authService.register()
 *
 * 3. authService.register
 *    → Validate input ✓
 *    → Check email not taken ✓
 *    → Check username not taken ✓
 *    → Hash password with bcryptjs
 *    → Create user in DB
 *    → Generate JWT token
 *    → Return user + token
 *
 * 4. Controller returns 201 Created
 *
 * Response:
 * HTTP/1.1 201 Created
 * Content-Type: application/json
 * {
 *   "success": true,
 *   "user": {
 *     "_id": "6489abc123def456",
 *     "email": "alice@example.com",
 *     "username": "alice_wonder",
 *     "createdAt": "2026-05-27T18:00:00.000Z"
 *   },
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 *
 * Frontend:
 * → Stores token in localStorage
 * → Stores user info in state
 * → Redirects to dashboard
 *
 * ═════════════════════════════════════════════════════════════════
 *
 * EXAMPLE 2: Login Attempt (Wrong Password)
 * ──────────────────────────────────────────
 *
 * Request:
 * POST /api/auth/login
 * {
 *   "email": "alice@example.com",
 *   "password": "WrongPassword123"
 * }
 *
 * Processing:
 * 1. authLimiter middleware
 *    → Check IP hasn't exceeded 5 attempts/15min
 *    → First attempt, count = 1 ✓
 *
 * 2. validateRequest middleware
 *    → Validate email format ✓
 *    → Validate password length ✓
 *
 * 3. authController.login
 *    → Call authService.login()
 *
 * 4. authService.login
 *    → Validate input ✓
 *    → Find user by email ✓
 *    → Compare: bcrypt.compare("WrongPassword123", storedHash)
 *    → Hashes don't match ✗
 *    → Throw AuthenticationError
 *
 * 5. Error handler catches AuthenticationError
 *    → Status 401
 *    → Message: "Invalid email or password"
 *
 * Response:
 * HTTP/1.1 401 Unauthorized
 * {
 *   "success": false,
 *   "message": "Invalid email or password"
 * }
 *
 * Frontend:
 * → Shows error message
 * → User can retry
 *
 * ═════════════════════════════════════════════════════════════════
 *
 * EXAMPLE 3: Protected Route Access
 * ──────────────────────────────────
 *
 * Request:
 * GET /api/auth/me
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * Processing:
 * 1. requireAuth middleware
 *    → Extract token from header ✓
 *    → Verify token signature (using JWT_SECRET) ✓
 *    → Check token not expired ✓
 *    → Decode payload: { userId: "6489abc...", email: "alice@..." }
 *    → Set req.user = { userId, email }
 *
 * 2. authController.getCurrentUser
 *    → Get userId from req.user ✓
 *    → Call authService.getUserById(userId)
 *    → Return user info
 *
 * 3. Controller returns 200 OK
 *
 * Response:
 * HTTP/1.1 200 OK
 * {
 *   "success": true,
 *   "user": {
 *     "_id": "6489abc123def456",
 *     "email": "alice@example.com",
 *     "username": "alice_wonder",
 *     "createdAt": "2026-05-27T18:00:00.000Z"
 *   }
 * }
 *
 * ═════════════════════════════════════════════════════════════════
 */
