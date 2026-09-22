// frontend/src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  // hooks.server.ts already populates locals.user via /auth/me
  return {
    user: locals.user,
  };
};