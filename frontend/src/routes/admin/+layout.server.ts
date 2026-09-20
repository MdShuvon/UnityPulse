// frontend/src/routes/admin/+layout.server.ts
// NEW FILE — fixes issue #6
//
// The admin area previously had no server guard: +layout.svelte did an onMount
// fetch and then goto('/login'). That means the admin shell renders, the sidebar
// flashes, and every admin page component mounts before the redirect happens.
//
// This runs on the server before any HTML is sent. The backend still enforces
// access on every endpoint — this is the UX half of the same rule, not a
// replacement for it.

import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const ADMIN_ROLES = ['LOCAL_ADMIN', 'SUPER_ADMIN'];

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const user = locals.user;

  if (!user) {
    throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
  }

  if (!ADMIN_ROLES.includes(user.role)) {
    // Logged in but not an admin — send home, not to login. Sending an
    // authenticated user to /login is confusing and looks like a bug.
    throw redirect(302, '/home');
  }

  return { user };
};