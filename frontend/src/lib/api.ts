// frontend/src/lib/api.ts
// FULL REPLACEMENT — fixes issue #12 (duplicate api.js / api.ts) and the
// 117 hardcoded "https://localhost:3001" strings across the frontend.
//
// ACTION: delete frontend/src/lib/api.js, keep only this file, and replace
// every raw fetch('https://localhost:3001/...') call with api.get/post/...
//
// One place now owns: base URL, credentials, JSON handling, error shape.

import { PUBLIC_API_BASE_URL } from '$env/static/public';

export const API_BASE = PUBLIC_API_BASE_URL || 'https://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type FetchLike = typeof globalThis.fetch;

interface RequestOptions {
  /** Pass SvelteKit's `fetch` from a load function so SSR forwards cookies. */
  fetch?: FetchLike;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  const doFetch = opts.fetch ?? globalThis.fetch;
  const isFormData = body instanceof FormData;

  const res = await doFetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include', // session cookie — required on every call
    headers: {
      ...(isFormData ? {} : body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...opts.headers,
    },
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error ?? data?.message ?? `Request failed (${res.status})`,
      data?.issues,
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('POST', path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PATCH', path, body, opts),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PUT', path, body, opts),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, undefined, opts),
};

/** SSE helper — EventSource cannot set headers, so the cookie must be same-site. */
export function subscribe(path: string, onMessage: (data: any) => void): () => void {
  const source = new EventSource(`${API_BASE}${path}`, { withCredentials: true });
  source.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {
      /* keep-alive pings are not JSON */
    }
  };
  return () => source.close();
}