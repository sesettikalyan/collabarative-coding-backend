import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import logger from './logger.js';

/**
 * JWT Token Utility
 *
 * Why JWT?
 * - Stateless: No need to store sessions on server
 * - Scalable: Works across multiple servers (important for Phase 7+)
 * - Standard: Industry standard for authentication
 * - Self-contained: Token includes user info + signature
 *
 * Token Structure (3 parts separated by dots):
 * header.payload.signature
 * - header: { alg: "HS256", typ: "JWT" }
 * - payload: { userId, iat, exp } (what we care about)
 * - signature: HMAC-SHA256(header.payload, secret)
 *
 * Why HMAC signature?
 * - Proves token wasn't tampered with
 * - Only server knows JWT_SECRET
 * - If someone changes payload, signature doesn't match = invalid
 */

export interface TokenPayload {
  userId: string;
  email?: string;
}

/**
 * Generate JWT token
 *
 * Used in: Login, Register, Token Refresh
 */
export const generateToken = (payload: TokenPayload): string => {
  try {
    const token = jwt.sign(payload, env.jwtSecret, {
      expiresIn: env.jwtExpire,
    } as any);
    return token;
  } catch (error) {
    logger.error('Error generating JWT token:', error);
    throw error;
  }
};

/**
 * Verify JWT token
 *
 * Used in: Protected route middleware, WebSocket authentication
 *
 * Returns decoded payload if valid
 * Throws error if invalid/expired
 */
export const verifyToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Token expired');
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token');
      throw new Error('Invalid token');
    }
    logger.error('Error verifying JWT token:', error);
    throw error;
  }
};

/**
 * Extract token from Authorization header
 *
 * Expected format: "Bearer <token>"
 * Example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Decode token without verifying (use with caution)
 *
 * Sometimes we want to read token info without verification
 * Example: WebSocket connection, extract userId before verifying
 */
export const decodeTokenWithoutVerify = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};
