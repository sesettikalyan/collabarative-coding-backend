import { Router } from 'express';
import { executionController } from './execution.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { runCodeSchema } from './execution.validation.js';

const router = Router();

// Protect execution endpoint to prevent abuse/spam
router.use(requireAuth);

router.post(
  '/run',
  validateRequest({ body: runCodeSchema }),
  executionController.runCode
);

export default router;
