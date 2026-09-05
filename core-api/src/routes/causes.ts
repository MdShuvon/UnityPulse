// causes.ts

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

  // ── SUPER_ADMIN: Cause Management ──────────────

  app.get('/admin/causes', { preHandler: requireAdmin }, async (req, reply) => {
    const adminId = (req.session as any).userId;
    try {
      return reply.send(await causeService.getAdminCauses(adminId));
    } catch (err: any) {
      return reply.code(403).send({ error: err.message });
    }
  });

  app.post('/admin/causes', { preHandler: requireAdmin }, async (req, reply) => {
    const adminId = (req.session as any).userId;
    const data = req.body as any;
    try {
      return reply.code(201).send(await causeService.createCause(adminId, data));
    } catch (err: any) {
      return reply.code(403).send({ error: err.message });
    }
  });

  app.patch('/admin/causes/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const adminId = (req.session as any).userId;
    const { id } = req.params as { id: string };
    const data = req.body as any;
    try {
      return reply.send(await causeService.updateCause(adminId, id, data));
    } catch (err: any) {
      return reply.code(403).send({ error: err.message });
    }
  });

  // ── LOCAL_ADMIN: Submit Join Request ───────────

  app.post('/admin/causes/:causeId/join-requests', { preHandler: requireAdmin }, async (req, reply) => {
    const adminId = (req.session as any).userId;
    const { causeId } = req.params as { causeId: string };
    const data = req.body as any;
    try {
      return reply.code(201).send(await causeService.submitJoinRequest(adminId, causeId, data));
    } catch (err: any) {
      return reply.code(403).send({ error: err.message });
    }
  });

  // ── SUPER_ADMIN: Review Join Requests ──────────

  app.get('/admin/causes/join-requests/pending', { preHandler: requireAdmin }, async (req, reply) => {
    const adminId = (req.session as any).userId;
    try {
      return reply.send(await causeService.getPendingJoinRequests(adminId));
    } catch (err: any) {
      return reply.code(403).send({ error: err.message });
    }
  });

  app.patch('/admin/causes/join-requests/:id/decision', { preHandler: requireAdmin }, async (req, reply) => {
    const adminId = (req.session as any).userId;
    const { id } = req.params as { id: string };
    const { decision, reviewNote } = req.body as any;
    try {
      return reply.send(await causeService.reviewJoinRequest(adminId, id, decision, reviewNote));
    } catch (err: any) {
      return reply.code(403).send({ error: err.message });
    }
  });

  // ── SUPER_ADMIN: Add FAQ ───────────────────────

  app.post('/admin/causes/:id/faqs', { preHandler: requireAdmin }, async (req, reply) => {
    const adminId = (req.session as any).userId;
    const { id } = req.params as { id: string };
    const data = req.body as any;
    try {
      return reply.code(201).send(await causeService.addFaq(adminId, id, data));
    } catch (err: any) {
      return reply.code(403).send({ error: err.message });
    }
  });
}