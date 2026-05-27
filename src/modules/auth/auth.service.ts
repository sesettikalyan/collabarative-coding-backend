import User, { IUser } from './auth.model.js';
import { hashPassword, comparePassword } from '../../utils/hash.js';
import { generateToken } from '../../utils/jwt.js';
import { validateOrThrow } from '../../middleware/validation.middleware.js';
import { registerSchema, loginSchema } from '../../utils/validators.js';
import {
  ValidationError,
  ConflictError,
  AuthenticationError,
  NotFoundError,
} from '../../utils/errors.js';
import logger from '../../utils/logger.js';

/**
 * Auth Service
 *
 * This is the BUSINESS LOGIC layer
 *
 * Responsibility: NOT HTTP-related
 * - Register a user
 * - Verify credentials
 * - Generate tokens
 * - Password hashing
 *
 * Uses: User model, utilities (hash, jwt, validation)
 *
 * Controller will call these methods and handle HTTP responses
 */

interface RegisterInput {
  email: string;
  username: string;
  password: string;
  confirmPassword?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  user: Partial<IUser>;
  token: string;
}

class AuthService {
  /**
   * Register a new user
   *
   * Steps:
   * 1. Validate input (Joi schema)
   * 2. Check if email already registered
   * 3. Check if username already taken
   * 4. Hash password
   * 5. Create user in DB
   * 6. Generate JWT token
   * 7. Return user + token
   *
   * Throws errors:
   * - ValidationError (400) - Invalid input
   * - ConflictError (409) - Email/username exists
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Step 1: Validate input against schema
    validateOrThrow(input, registerSchema);

    const { email, username, password } = input;

    logger.info(`Registering user: ${email}`);

    // Step 2: Check if email already exists
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      logger.warn(`Registration failed: Email already exists - ${email}`);
      throw new ConflictError('Email already registered. Try logging in.');
    }

    // Step 3: Check if username already exists
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      logger.warn(`Registration failed: Username already exists - ${username}`);
      throw new ConflictError('Username already taken. Choose another.');
    }

    // Step 4: Hash password
    const passwordHash = await hashPassword(password);

    // Step 5: Create user in database
    const user = await User.create({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash, // Hash stored, not password
    });

    logger.info(`✅ User registered: ${user._id} (${email})`);

    // Step 6: Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

    // Step 7: Return user (without password hash) + token
    return {
      success: true,
      user: user.toJSON(),
      token,
    };
  }

  /**
   * Login user with email and password
   *
   * Steps:
   * 1. Validate input
   * 2. Find user by email
   * 3. Compare password with hash
   * 4. Generate JWT token
   * 5. Update lastLoginAt
   * 6. Return user + token
   *
   * Throws errors:
   * - ValidationError (400) - Invalid input
   * - AuthenticationError (401) - Wrong email/password
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    // Step 1: Validate input
    validateOrThrow(input, loginSchema);

    const { email, password } = input;

    logger.info(`Login attempt: ${email}`);

    // Step 2: Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      logger.warn(`Login failed: User not found - ${email}`);
      throw new AuthenticationError('Invalid email or password');
    }

    // Step 3: Compare password with hash
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      logger.warn(`Login failed: Invalid password - ${email}`);
      throw new AuthenticationError('Invalid email or password');
    }

    // Step 4: Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

    // Step 5: Update last login time
    user.lastLoginAt = new Date();
    await user.save();

    logger.info(`✅ User logged in: ${user._id} (${email})`);

    // Step 6: Return user + token
    return {
      success: true,
      user: user.toJSON(),
      token,
    };
  }

  /**
   * Get user by ID
   *
   * Used in: Protected routes to get user info
   * Example: GET /api/users/profile → Uses requireAuth middleware
   *          → Calls userService.getProfile(req.user.userId)
   */
  async getUserById(userId: string): Promise<Partial<IUser> | null> {
    const user = await User.findById(userId);
    if (!user) {
      return null;
    }
    return user.toJSON();
  }

  /**
   * Verify if user exists (for token refresh, etc.)
   */
  async userExists(userId: string): Promise<boolean> {
    const user = await User.findById(userId);
    return !!user;
  }

  /**
   * Get user stats (for dashboard)
   *
   * Returns: Count of rooms created, total collaborators, etc.
   * Will be implemented in Phase 2 Step 3 (extended)
   */
  async getUserStats(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    return {
      userId: user._id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      // More stats will be added later
    };
  }
}

// Export singleton instance
export default new AuthService();

/**
 * Usage in Controller:
 *
 * router.post('/register', async (req, res, next) => {
 *   try {
 *     const result = await authService.register(req.body);
 *     res.status(201).json(result);
 *   } catch (err) {
 *     next(err);  // Pass to error handler
 *   }
 * });
 *
 * router.post('/login', async (req, res, next) => {
 *   try {
 *     const result = await authService.login(req.body);
 *     res.json(result);
 *   } catch (err) {
 *     next(err);
 *   }
 * });
 */
