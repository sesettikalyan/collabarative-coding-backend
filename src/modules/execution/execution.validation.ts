import Joi from 'joi';

export const runCodeSchema = Joi.object({
  language: Joi.string()
    .valid('cpp', 'java', 'python', 'javascript')
    .required()
    .messages({
      'any.only': 'Language must be one of: cpp, java, python, javascript',
      'any.required': 'Language is required',
    }),
  code: Joi.string().required().messages({
    'any.required': 'Source code is required',
  }),
  stdin: Joi.string().allow('').optional(),
});
