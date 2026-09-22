// frontend/src/routes/home/+page.server.ts
import type { PageServerLoad } from './$types';
import { Agent, fetch as undiciFetch } from 'undici';

const API = 'https://localhost:3001';

const localTlsAgent = new Agent({
  connect: { rejectUnauthorized: false },
});

async function fetchApi<T = any>(path: string): Promise<T | null> {
  try {
    const r = await undiciFetch(`${API}${path}`, {
      dispatcher: localTlsAgent,
    } as any);
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

export const load: PageServerLoad = async ({ locals }) => {
  return {
    user: locals.user,
    stats: fetchApi<any>('/home'),
    highlights: fetchApi<any>('/home/highlights').then(
      (d) => d ?? { topTasks: [], careerSnippet: [] }
    ),
    featuredCause: fetchApi<any[]>('/causes/featured').then((d) => d ?? []),
  };
};