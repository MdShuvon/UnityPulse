// core-api/src/routes/causes.ts

import { FastifyInstance } from 'fastify';
import { causeService } from '../services/causeService';
import { requireAuth, requireAdmin } from '../middleware/authGuard';

export async function causeRoutes(app: FastifyInstance) {

  // ── PUBLIC ROUTES ──────────────────────────────

  app.get('/causes', async (req, reply) => {
    return reply.send(await causeService.getActiveCauses());
  });

  app.get('/causes/featured', async (req, reply) => {
    const causes = await causeService.getActiveCauses();
    // সব ACTIVE cause-ই দেখান (mockup অনুযায়ী grid format)
    return reply.send(causes);
  });

  app.get('/causes/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      return reply.send(await causeService.getCauseDetail(id));
    } catch (err: any) {
      return reply.code(404).send({ error: err.message });
    }
  });
}