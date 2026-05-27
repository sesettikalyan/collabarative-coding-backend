import bcrypt from 'bcryptjs';
import logger from './logger.js';

/**
 * Password Hashing Utility
 *
 * Why hash passwords?
 * - Never store plain passwords in database
 * - If database is breached, passwords are still protected
 * - One-way function: can't decrypt to get original password
 * - Salting: Each password has unique random salt → same password = different hashes
 *
 * Why bcryptjs (not plain bcrypt)?
 * - Pure JavaScript implementation (works everywhere)
 * - bcrypt requires native C++ binding (platform-specific)
 * - Slightly slower but portable (good for development)
 *
 * Bcrypt Algorithm:
 * bcrypt(password, salt) → hash
 * - Cost factor (rounds): 10 = 2^10 iterations (default, good balance)
 * - Higher cost = more secure but slower
 * - Currently 10 is industry standard
 *
 * When user logs in:
 * 1. Frontend sends plain password
 * 2. Backend hashes it with stored salt
 * 3. Compare hashes (not passwords)
 * 4. Match = correct password
 */

const SALT_ROUNDS = 10; // Cost factor (2^10 iterations)

/**
 * Hash a plain password
 *
 * Used in: User registration, password change
 *
 * Returns: Hashed password (includes salt inside the hash)
 */
export const hashPassword = async (plainPassword: string): Promise<string> => {
  try {
    // bcrypt.hash generates random salt and hashes
    // Includes salt in returned hash, so we don't need to store separately
    const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    return hash;
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw error;
  }
};

/**
 * Compare plain password with stored hash
 *
 * Used in: Login verification
 *
 * Returns: true if password matches, false otherwise
 */
export const comparePassword = async (
  plainPassword: string,
  passwordHash: string
): Promise<boolean> => {
  try {
    // bcrypt.compare extracts salt from hash and compares
    const isMatch = await bcrypt.compare(plainPassword, passwordHash);
    return isMatch;
  } catch (error) {
    logger.error('Error comparing password:', error);
    throw error;
  }
};

/**
 * Check if a password is hashed (for validation)
 *
 * Bcrypt hashes always start with '$2a$', '$2b$', or '$2y$'
 * This is a quick check (doesn't verify correctness)
 */
export const isHashedPassword = (passwordHash: string): boolean => {
  return /^\$2[aby]\$/.test(passwordHash);
};

/**
 * Example usage:
 *
 * Register:
 * const plainPassword = "MySecurePassword123!";
 * const hash = await hashPassword(plainPassword);
 * // Store hash in database
 *
 * Login:
 * const plainPassword = "MySecurePassword123!";
 * const isValid = await comparePassword(plainPassword, storedHash);
 * if (isValid) {
 *   // Password correct, generate JWT token
 * } else {
 *   // Invalid credentials
 * }
 */
