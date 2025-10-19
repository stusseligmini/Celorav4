// Common types for Deno Edge Functions

export interface EdgeFunctionRequest extends Request {
  method: string;
  url: string;
  headers: Headers;
}

export interface EdgeFunctionResponse extends Response {
  status: number;
  headers: Headers;
}

export interface DenoEnv {
  get(key: string): string | undefined;
}

// Extend global with Deno
declare global {
  const Deno: {
    env: DenoEnv;
  };
}