import Joi from 'joi';

// ─────────────────────────────────────────────
// Validation schemas for room HTTP endpoints
// These run before the controller via middleware
// ─────────────────────────────────────────────

export const createRoomSchema = Joi.object({
    name: Joi.string().min(3).max(50).trim().required().messages({
        'string.min': 'Room name must be at least 3 characters',
        'string.max': 'Room name cannot exceed 50 characters',
        'any.required': 'Room name is required',
    }),
    language: Joi.string()
        .valid('cpp', 'java', 'python', 'javascript')
        .required()
        .messages({
            'any.only': 'Language must be one of: cpp, java, python, javascript',
            'any.required': 'Language is required',
        }),
    maxParticipants: Joi.number().integer().min(2).max(20).default(10),
});

// Used when joining — just validate the roomId format
export const roomIdParamSchema = Joi.object({
    roomId: Joi.string().min(5).max(20).required().messages({
        'any.required': 'Room ID is required',
    }),
});