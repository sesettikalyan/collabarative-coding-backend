import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import { RunCodeRequest, ExecutionResult } from './execution.types.js';
import logger from '../../utils/logger.js';

/**
 * Judge0 Language IDs mapping
 * These correspond to specific language versions on Judge0 API.
 */
const LANGUAGE_MAPPING = {
  cpp: 54,          // C++ (GCC 9.2.0)
  java: 62,         // Java (OpenJDK 13.0.1)
  python: 71,       // Python (3.8.1)
  javascript: 93,   // Node.js (18.15.0)
} as const;

class ExecutionService {
  /**
   * Sends code to Judge0 API to be securely executed in a sandbox.
   */
  async runCode(data: RunCodeRequest): Promise<ExecutionResult> {
    const languageId = LANGUAGE_MAPPING[data.language];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add RapidAPI keys if configured in .env
    if (env.judge0ApiKey) {
      headers['X-RapidAPI-Key'] = env.judge0ApiKey;
      headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
    }

    try {
      // wait=true instructs Judge0 to run code synchronously 
      // instead of returning a token we have to poll.
      const response = await fetch(
        `${env.judge0Url}/submissions?base64_encoded=false&wait=true`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            source_code: data.code,
            language_id: languageId,
            stdin: data.stdin || '',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Judge0 API error: ${response.status} ${response.statusText}`);
      }

      const result = (await response.json()) as ExecutionResult;
      return result;
    } catch (error: any) {
      logger.error('Error executing code via Judge0:', error.message);
      throw new AppError(
        503,
        'Code execution service is currently unavailable. Please try again later.'
      );
    }
  }
}

export const executionService = new ExecutionService();
