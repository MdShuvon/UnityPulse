import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, url }) => {
  if (!(locals as any).user) {
    throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
  }
  return { user: (locals as any).user };
};