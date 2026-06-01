export interface RunCodeRequest {
  language: 'cpp' | 'java' | 'python' | 'javascript';
  code: string;
  stdin?: string;
}

export interface ExecutionResult {
  stdout: string | null;
  time: string | null;
  memory: number | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
}
