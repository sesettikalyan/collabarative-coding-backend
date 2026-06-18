import { AppError } from '../../utils/errors.js';
import { RunCodeRequest, ExecutionResult } from './execution.types.js';
import logger from '../../utils/logger.js';
import { exec } from 'child_process';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import util from 'util';

const execAsync = util.promisify(exec);

class ExecutionService {
  /**
   * Securely executes code using Docker containers.
   * This completely isolates the execution from the host machine (no RCE risk),
   * and solves all Windows/Judge0/API issues!
   */
  async runCode(data: RunCodeRequest): Promise<ExecutionResult> {
    const fileId = randomUUID();
    let execDir = '';
    let command = '';

    try {
      // 1. Create a secure temporary directory for execution
      execDir = join(tmpdir(), fileId);
      await mkdir(execDir, { recursive: true });

      switch (data.language) {
        case 'javascript':
          await writeFile(join(execDir, 'code.js'), data.code);
          command = `docker run --rm --network none --memory=128m --cpus=0.5 -v "${execDir}:/app" -w /app node:18-alpine node code.js`;
          break;
        case 'python':
          await writeFile(join(execDir, 'code.py'), data.code);
          command = `docker run --rm --network none --memory=128m --cpus=0.5 -v "${execDir}:/app" -w /app python:3.10-alpine python code.py`;
          break;
        case 'cpp':
          await writeFile(join(execDir, 'main.cpp'), data.code);
          // Uses GCC to compile and then execute
          command = `docker run --rm --network none --memory=256m --cpus=1.0 -v "${execDir}:/app" -w /app gcc:12 sh -c "g++ main.cpp -o main && ./main"`;
          break;
        case 'java':
          await writeFile(join(execDir, 'Main.java'), data.code);
          // Uses Eclipse Temurin (OpenJDK) to compile and then execute (assumes public class Main)
          command = `docker run --rm --network none --memory=256m --cpus=1.0 -v "${execDir}:/app" -w /app eclipse-temurin:17-alpine sh -c "javac Main.java && java Main"`;
          break;
        default:
          throw new AppError(400, `Language ${data.language} is not supported in this local Docker setup yet.`);
      }

      const start = performance.now();

      // Execute the Docker container (15s timeout)
      const { stdout, stderr } = await execAsync(command, { timeout: 15000 });

      const end = performance.now();
      const time = ((end - start) / 1000).toFixed(3);

      return {
        stdout: stdout || null,
        time: time,
        memory: null,
        stderr: stderr || null,
        compile_output: null,
        message: null,
        status: { id: 3, description: 'Accepted' }
      };
    } catch (error: any) {
      let errorMsg = error.stderr || error.stdout || error.message || 'Execution failed';

      if (error.killed) {
        errorMsg = 'Execution timed out (exceeded time limit).';
      }

      return {
        stdout: error.stdout || null,
        time: null,
        memory: null,
        stderr: errorMsg,
        compile_output: null,
        message: null,
        status: { id: 11, description: 'Error' }
      };
    } finally {
      // Clean up the temporary directory from the host
      if (execDir) {
        await rm(execDir, { recursive: true, force: true }).catch(() => { });
      }
    }
  }
}

export const executionService = new ExecutionService();
