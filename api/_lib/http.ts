export interface VercelRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string | string[]): VercelResponse;
  json(body: unknown): void;
  send(body: string): void;
  end(): void;
}

export function disableCaching(response: VercelResponse): void {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function requestHeader(request: VercelRequest, name: string): string | undefined {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function requestBody(request: VercelRequest): unknown {
  if (typeof request.body !== 'string') return request.body;
  try {
    return JSON.parse(request.body) as unknown;
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

export function sendError(
  response: VercelResponse,
  error: unknown,
  fallback = 'Internal server error',
): void {
  if (error instanceof HttpError) {
    for (const [name, value] of Object.entries(error.headers)) response.setHeader(name, value);
    response.status(error.status).send(error.message);
    return;
  }
  response.status(500).send(fallback);
}
