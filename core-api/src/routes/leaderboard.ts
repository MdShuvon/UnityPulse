//core-api/src/routes/leaderboard.ts
import { FastifyInstance }    from 'fastify';
import { leaderboardService } from '../services/leaderboardService';
import { requireAuth }        from '../middleware/authGuard';

function parseParams(query: any) {
  return {
    // Fix 4: max 100 cap
    limit: Math.max(1, Math.min(100, Number(query.limit) || 20)),
    page:  Math.max(1, Number(query.page) || 1),
  };
}

export async function leaderboardRoutes(app: FastifyInstance) {

  // ── GLOBAL ──────────────────────────────────────
  app.get('/leaderboard/donation', async (req, reply) => {
    const { limit, page } = parseParams(req.query);
    return reply.send(await leaderboardService.getDonationLeaderboard(limit, page));
  });

  app.get('/leaderboard/task', async (req, reply) => {
    const { limit, page } = parseParams(req.query);
    return reply.send(await leaderboardService.getTaskLeaderboard(limit, page));
  });

  app.get('/leaderboard/organization', async (req, reply) => {
    const { limit } = parseParams(req.query);
    return reply.send(await leaderboardService.getOrgLeaderboard(limit));
  });

  // ── MY GLOBAL RANK ──────────────────────────────
  app.get('/leaderboard/my-rank',
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = (req.session as any).userId;
      return reply.send(await leaderboardService.getMyRank(userId));
    }
  );

  // ── ORG INTERNAL LEADERBOARDS (NEW) ─────────────
  app.get('/leaderboard/org/:orgId/donation', async (req, reply) => {
    const { orgId } = req.params as { orgId: string };
    const { limit, page } = parseParams(req.query);
    return reply.send(
      await leaderboardService.getOrgDonationLeaderboard(orgId, limit, page)
    );
  });

  app.get('/leaderboard/org/:orgId/task', async (req, reply) => {
    const { orgId } = req.params as { orgId: string };
    const { limit, page } = parseParams(req.query);
    return reply.send(
      await leaderboardService.getOrgTaskLeaderboard(orgId, limit, page)
    );
  });

  // ── MY ORG RANK (NEW) ───────────────────────────
  app.get('/leaderboard/my-org-rank',
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = (req.session as any).userId;
      return reply.send(await leaderboardService.getMyOrgRank(userId));
    }
  );
}