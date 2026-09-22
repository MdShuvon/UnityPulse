import type { Handle } from '@sveltejs/kit';
import { Agent, fetch as undiciFetch } from 'undici';

const API_BASE = process.env.API_BASE_URL || 'https://localhost:3001';

const localTlsAgent = new Agent({
  connect: { rejectUnauthorized: false },
});

export const handle: Handle = async ({ event, resolve }) => {
  const cookie = event.request.headers.get('cookie') ?? '';

  if (!cookie) {
    event.locals.user = null;
    return resolve(event);
  }

  try {
    const res = await undiciFetch(`${API_BASE}/auth/me`, {
      headers: { cookie },
      signal: AbortSignal.timeout(5000),
      dispatcher: localTlsAgent,
    } as any);

    if (res.ok) {
      const data = await res.json();
      event.locals.user = data as App.Locals['user'];
    } else {
      event.locals.user = null;
    }
  } catch (err) {
    console.error('[hooks] fetch error:', err);
    event.locals.user = null;
  }

  return resolve(event);
};