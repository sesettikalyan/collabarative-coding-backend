import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment Configuration
 *
 * This module centralizes all environment variables.
 * Validates that required variables exist at startup.
 *
 * Why centralize?
 * - Single source of truth for config
 * - Type-safe access
 * - Fail fast if required vars missing
 */

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'PORT', 'FRONTEND_URL'];

const checkEnvVars = () => {
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

checkEnvVars();

export const env = {
  // Server
  nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production',
  port: parseInt(process.env.PORT || '5000', 10),

  // Database
  mongodbUri: process.env.MONGODB_URI!,

  // JWT
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpire: process.env.JWT_EXPIRE || '7d',

  // Frontend (CORS)
  frontendUrl: process.env.FRONTEND_URL!,

  // Judge0 (Optional - for code execution)
  judge0Url: process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com',
  judge0ApiKey: process.env.JUDGE0_API_KEY || '',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Derived values
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
} as const;

export default env;
