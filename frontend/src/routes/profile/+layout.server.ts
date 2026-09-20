// frontend/src/routes/profile/+layout.server.ts
// FULL REPLACEMENT — this file was entirely commented out.
//
// It works now because hooks.server.ts (correctly named) populates locals.user.

import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
  }
  return { user: locals.user };
};