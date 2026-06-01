import { Request, Response } from 'express';
import { executionService } from './execution.service.js';

class ExecutionController {
  // POST /api/execution/run
  runCode = async (req: Request, res: Response): Promise<void> => {
    // The request body is already validated at this point by Joi middleware
    const result = await executionService.runCode(req.body);

    res.json({
      success: true,
      data: result,
    });
  };
}

export const executionController = new ExecutionController();
