import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/errors.js';

/**
 * Validation Middleware Factory
 *
 * Why a middleware factory?
 * - Reusable across all routes
 * - Consistent error handling
 * - Separates validation from route logic
 *
 * Middleware Chain:
 * Request → Validation Middleware (checks schema) → Route Handler (receives validated data)
 *
 * If validation fails:
 * - Error thrown immediately
 * - Express error handler catches it
 * - Client gets 400 response with error message
 */

export interface ValidatorSchema {
  body?: Joi.Schema;
  query?: Joi.Schema;
  params?: Joi.Schema;
}

/**
 * Create validation middleware for a route
 *
 * Usage in routes:
 * router.post('/login',
 *   validateRequest({ body: loginSchema }),
 *   loginController
 * );
 */
export const validateRequest = (schema: ValidatorSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schema.body) {
        const { error, value } = schema.body.validate(req.body, {
          abortEarly: true,
          stripUnknown: true,
        });

        if (error) {
          const message = error.details[0]?.message || 'Validation error';
          throw new ValidationError(message);
        }

        // Replace req.body with validated and cleaned data
        req.body = value;
      }

      // Validate query parameters
      if (schema.query) {
        const { error, value } = schema.query.validate(req.query, {
          abortEarly: true,
          stripUnknown: true,
        });

        if (error) {
          const message = error.details[0]?.message || 'Validation error';
          throw new ValidationError(message);
        }

        req.query = value;
      }

      // Validate URL parameters
      if (schema.params) {
        const { error, value } = schema.params.validate(req.params, {
          abortEarly: true,
          stripUnknown: true,
        });

        if (error) {
          const message = error.details[0]?.message || 'Validation error';
          throw new ValidationError(message);
        }

        req.params = value;
      }

      // All validations passed
      next();
    } catch (err) {
      // Pass to Express error handler
      next(err);
    }
  };
};

/**
 * Alternative: Validate in route handler (less common)
 *
 * Usage:
 * router.post('/login', (req, res, next) => {
 *   try {
 *     const validated = await validatePayload(req.body, loginSchema);
 *     // Use validated data
 *   } catch (err) {
 *     next(err);
 *   }
 * });
 */
export const validatePayload = async (data: any, schema: Joi.Schema): Promise<any> => {
  const { error, value } = schema.validate(data, {
    abortEarly: true,
    stripUnknown: true,
  });

  if (error) {
    const message = error.details[0]?.message || 'Validation error';
    throw new ValidationError(message);
  }

  return value;
};

/**
 * Quick validation helper for services
 *
 * Usage in service:
 * validateOrThrow(userData, registerSchema);
 * // If invalid, throws ValidationError
 * // If valid, just returns
 */
export const validateOrThrow = (data: any, schema: Joi.Schema): void => {
  const { error } = schema.validate(data, { abortEarly: true });

  if (error) {
    const message = error.details[0]?.message || 'Validation error';
    throw new ValidationError(message);
  }
};

/**
 * Full Example - How it works in a real route:
 *
 * routes/auth.ts:
 * ────────────────
 * router.post('/login',
 *   validateRequest({ body: loginSchema }),  // ← Middleware validates
 *   authController.login                     // ← Route handler receives clean data
 * );
 *
 * Controller:
 * ───────────
 * async login(req, res, next) {
 *   try {
 *     // req.body is already validated and cleaned
 *     const { email, password } = req.body;
 *
 *     // Can safely use this data
 *     const result = await authService.login(email, password);
 *
 *     res.json({ success: true, data: result });
 *   } catch (err) {
 *     next(err); // Error handler catches
 *   }
 * }
 *
 * What happens on bad request:
 * ─────────────────────────────
 * Client sends: { email: "invalid", password: "123" }
 *
 * Middleware catches:
 * - email is not a valid email format
 * - password is less than 6 characters
 *
 * Throws: ValidationError("email must be a valid email")
 *
 * Error handler responds:
 * {
 *   "success": false,
 *   "message": "email must be a valid email",
 *   "statusCode": 400
 * }
 *
 * Controller never runs! ✓ Protects business logic from bad data
 */
