/**
 * Custom Error Classes
 *
 * Why custom errors?
 * - Express middleware can catch and handle them consistently
 * - Standardized response format to frontend
 * - Easy to distinguish expected errors from unexpected ones
 * - Clean separation between business logic errors and system errors
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// 400 Bad Request
export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// 401 Unauthorized
export class AuthenticationError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

// 403 Forbidden
export class AuthorizationError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

// 404 Not Found
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

// 409 Conflict (duplicate key, etc.)
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

// 429 Too Many Requests
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(429, message);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

// 500 Internal Server Error
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(500, message, false); // isOperational = false, not our fault
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}
