// frontend/src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const API_BASE = env.API_BASE_URL ?? 'http://127.0.0.1:3001';

export const handle: Handle = async ({ event, resolve }) => {
  const cookie = event.request.headers.get('cookie') ?? '';

  if (!cookie) {
    event.locals.user = null;
    return resolve(event);
  }

  try {
    // Node fetch self-signed cert reject করে — dev-এ allow
    const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { cookie },
      signal: AbortSignal.timeout(5000),
    });

    if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;

    console.log('[hooks] status:', res.status);
    event.locals.user = res.ok ? await res.json() : null;
  } catch (err) {
    console.error('[hooks] fetch error:', err);
    event.locals.user = null;
  }

  return resolve(event);
};