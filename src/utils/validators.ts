import Joi from 'joi';

/**
 * Validation Schemas with Joi
 *
 * Why Joi?
 * - Declarative validation (readable, maintainable)
 * - Error messages included automatically
 * - Reusable across routes and services
 * - Prevents invalid data from reaching business logic
 *
 * Validation Flow:
 * User sends request → Middleware validates → Route handler runs
 *
 * If validation fails:
 * - Error caught by middleware
 * - Consistent error response (400 Bad Request)
 * - Never reach route handler
 *
 * Where we use these:
 * 1. Express middleware (catch bad requests early)
 * 2. Services (double-check before business logic)
 * 3. Tests (validate test data)
 */

// ========== AUTH VALIDATION ==========

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required',
    }),
});

export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username can only contain letters and numbers',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username must not exceed 30 characters',
      'any.required': 'Username is required',
    }),
  password: Joi.string()
    .min(6)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'string.pattern.base': 'Password must contain uppercase and numbers',
      'any.required': 'Password is required',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your password',
    }),
});

// ========== ROOM VALIDATION ==========

export const createRoomSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Room name cannot be empty',
      'string.max': 'Room name must not exceed 100 characters',
      'any.required': 'Room name is required',
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters',
    }),
  isPublic: Joi.boolean()
    .default(false),
  language: Joi.string()
    .valid('javascript', 'python', 'java', 'cpp')
    .default('javascript'),
});

export const joinRoomSchema = Joi.object({
  roomId: Joi.string()
    .required()
    .messages({
      'any.required': 'Room ID is required',
    }),
});

// ========== CHAT VALIDATION ==========

export const sendMessageSchema = Joi.object({
  roomId: Joi.string()
    .required()
    .messages({
      'any.required': 'Room ID is required',
    }),
  content: Joi.string()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Message cannot be empty',
      'string.max': 'Message must not exceed 1000 characters',
      'any.required': 'Message is required',
    }),
});

// ========== EXECUTION VALIDATION ==========

export const executeCodeSchema = Joi.object({
  roomId: Joi.string()
    .required(),
  code: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.min': 'Code cannot be empty',
      'any.required': 'Code is required',
    }),
  language: Joi.string()
    .valid('javascript', 'python', 'java', 'cpp')
    .required(),
  input: Joi.string()
    .optional()
    .allow('')
    .default(''),
});

// ========== VALIDATION HELPER ==========

/**
 * Validate data against schema
 *
 * Usage in services:
 * const { error, value } = validateData(data, loginSchema);
 * if (error) throw new ValidationError(error.message);
 */
export const validateData = (data: any, schema: Joi.Schema) => {
  const { error, value } = schema.validate(data, {
    abortEarly: true, // Stop at first error
    stripUnknown: true, // Remove unknown fields
  });

  return { error, value };
};

/**
 * Example usage in route handler:
 *
 * router.post('/login', (req, res, next) => {
 *   const { error, value } = validateData(req.body, loginSchema);
 *   if (error) {
 *     return res.status(400).json({ message: error.details[0].message });
 *   }
 *   // value is now validated and type-safe
 *   await authService.login(value.email, value.password);
 * });
 */
