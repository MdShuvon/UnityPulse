/**
 * UnityPulse API Client
 * Backend: http://localhost:3001 (Fastify + session cookies)
 * সব request এ credentials: 'include' — session cookie টা automatically যাবে
 */

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// Custom error class — status code সহ
export class ApiError extends Error {
  /** @type {number} */
  status;

  /**
   * @param {string} message
   * @param {number} status
   */
  constructor(message, status) {
    super(message);
    this.status  = status;
    this.name    = 'ApiError';
  }
}

/**
 * Core request function
 * @param {'GET'|'POST'|'PATCH'|'DELETE'} method
 * @param {string} path
 * @param {object|FormData|null} [body]
 * @returns {Promise<any>}
 */
async function request(method, path, body = null) {
  /** @type {HeadersInit} */
  const headers = {};
  /** @type {BodyInit|undefined} */
  let payload;

  if (body !== null) {
    if (body instanceof FormData) {
      // FormData — Content-Type browser নিজেই set করবে (multipart boundary সহ)
      payload = body;
    } else {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include', // ← session cookie এর জন্য জরুরি
      headers,
      body: payload,
    });
  } catch (networkErr) {
    throw new ApiError('Server এর সাথে connection নেই। Internet check করো।', 0);
  }

  // Response parse করো
  const contentType = res.headers.get('content-type') ?? '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = { message: await res.text() };
  }

  if (!res.ok) {
    throw new ApiError(
      data?.message || data?.error || `Error ${res.status}`,
      res.status
    );
  }

  return data;
}

/** Typed API object */
export const api = {
  /** @param {string} path */
  get: (path) => request('GET', path),

  /** @param {string} path @param {object} body */
  post: (path, body) => request('POST', path, body),

  /** @param {string} path @param {object} body */
  patch: (path, body) => request('PATCH', path, body),

  /** @param {string} path */
  delete: (path) => request('DELETE', path),

  /** File upload (FormData) @param {string} path @param {FormData} formData */
  upload: (path, formData) => request('POST', path, formData),
};