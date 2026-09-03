// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

const API_BASE = 'http://localhost:3001';

export const handle: Handle = async ({ event, resolve }) => {
  // Session cookie থেকে user info fetch করুন
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        cookie: event.request.headers.get('cookie') || '',
      },
    });

    if (res.ok) {
      const user = await res.json();
      event.locals.user = user;
    } else {
      event.locals.user = null;
    }
  } catch (err) {
    event.locals.user = null;
  }

  return resolve(event);
};