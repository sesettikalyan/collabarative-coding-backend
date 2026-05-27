/**
 * Auth Types & Interfaces
 *
 * Shared between backend and frontend
 *
 * These types will be exported to a shared 'types' package
 * that both frontend and backend use
 *
 * This ensures type safety across the API boundary
 */

// ========== REQUEST TYPES ==========

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ========== RESPONSE TYPES ==========

export interface UserResponse {
  _id: string;
  email: string;
  username: string;
  createdAt: string; // ISO 8601 date string
  lastLoginAt?: string | null;
}

export interface AuthResponse {
  success: boolean;
  user: UserResponse;
  token: string; // JWT token
}

export interface AuthErrorResponse {
  success: false;
  message: string;
}

// ========== AUTHENTICATION STATE ==========

/**
 * Frontend will use this to type Redux/Zustand state
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

// ========== TOKEN PAYLOAD ==========

/**
 * What's inside the JWT token
 *
 * When frontend decodes token (for debugging):
 * jwt_decode(token) returns TokenPayload
 */
export interface TokenPayload {
  userId: string;
  email?: string;
  iat?: number; // Issued at (unix timestamp)
  exp?: number; // Expiration (unix timestamp)
}

// ========== API ENDPOINTS ==========

/**
 * Centralized API endpoint paths
 *
 * Frontend will use:
 * const response = await axios.post('/api/auth/login', credentials);
 */

export const AUTH_ENDPOINTS = {
  REGISTER: '/api/auth/register',
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  ME: '/api/auth/me',
  STATS: '/api/auth/stats',
  // Future endpoints:
  // REFRESH_TOKEN: '/api/auth/refresh',
  // CHANGE_PASSWORD: '/api/auth/change-password',
  // FORGOT_PASSWORD: '/api/auth/forgot-password',
} as const;

// ========== LOCAL STORAGE KEYS ==========

/**
 * Keys for localStorage
 *
 * Frontend will use:
 * localStorage.setItem(STORAGE_KEYS.TOKEN, token);
 * const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
 */

export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  REFRESH_TOKEN: 'auth_refresh_token', // For future implementation
} as const;

// ========== ERROR CODES ==========

/**
 * Standardized error codes
 *
 * Frontend can check:
 * if (error.code === AUTH_ERROR_CODES.INVALID_CREDENTIALS) { ... }
 */

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  USERNAME_ALREADY_TAKEN: 'USERNAME_ALREADY_TAKEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

// ========== VALIDATION CONSTANTS ==========

/**
 * Frontend validation rules (should match backend)
 */

export const AUTH_VALIDATION = {
  EMAIL: {
    pattern: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
    message: 'Invalid email format',
  },
  USERNAME: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: 'Username: 3-30 chars, alphanumeric only',
  },
  PASSWORD: {
    minLength: 6,
    hasUppercase: /[A-Z]/,
    hasNumber: /[0-9]/,
    message: 'Password: 6+ chars, uppercase + numbers',
  },
} as const;

// ========== EXPORTED CONSTANTS ==========

/**
 * Example usage in frontend:
 *
 * import {
 *   AUTH_ENDPOINTS,
 *   STORAGE_KEYS,
 *   AUTH_VALIDATION,
 *   type AuthResponse,
 *   type UserResponse,
 * } from '@/types/auth.types';
 *
 * // Use endpoint
 * const response = await axios.post(AUTH_ENDPOINTS.LOGIN, credentials);
 *
 * // Use storage key
 * localStorage.setItem(STORAGE_KEYS.TOKEN, response.data.token);
 *
 * // Use validation
 * const isValidEmail = AUTH_VALIDATION.EMAIL.pattern.test(email);
 *
 * // Use types
 * const user: UserResponse = response.data.user;
 */
