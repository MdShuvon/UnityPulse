// core-api/src/routes/admin/causes.ts
import { FastifyInstance } from 'fastify';
import { causeService } from '../../services/causeService';
import { requireAdmin } from '../../middleware/authGuard';
import { z } from 'zod';

// Validation schemas
const createCauseSchema = z.object({
  title: z.string().min(3, 'কমপক্ষে ৩ অক্ষর').max(100, 'সর্বোচ্চ ১০০ অক্ষর'),
  story: z.string().min(20, 'কমপক্ষে ২০ অক্ষর'),
  coverImage: z.string().optional(),
  isFeatured: z.boolean().optional().default(false),
});

const updateCauseSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  story: z.string().min(20).optional(),
  coverImage: z.string().nullable().optional(),
  isFeatured: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'CLOSED']).optional(),
});

const joinRequestSchema = z.object({
  projectId: z.string().min(1, 'Project ID দরকার'),
  note: z.string().max(500).optional(),
});

const reviewRequestSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().max(200).optional(),
});

const faqSchema = z.object({
  question: z.string().min(3).max(200),
  answer: z.string().min(3).max(1000),
  order: z.number().int().min(0).optional(),
});

export async function adminCauseRoutes(app: FastifyInstance) {

  // ── JOIN REQUESTS (আগে - conflict avoid) ──────
  
  app.get('/admin/causes/join-requests/pending', 
    { preHandler: requireAdmin }, 
    async (req, reply) => {
      try {
        const adminId = (req.session as any).userId;
        return reply.send(await causeService.getPendingJoinRequests(adminId));
      } catch (err: any) {
        return reply.code(err.statusCode || 403).send({ error: err.message });
      }
    }
  );

  app.patch('/admin/causes/join-requests/:id/decision', 
    { preHandler: requireAdmin }, 
    async (req, reply) => {
      try {
        const adminId = (req.session as any).userId;
        const { id } = req.params as { id: string };
        const data = reviewRequestSchema.parse(req.body);
        return reply.send(await causeService.reviewJoinRequest(adminId, id, data.decision, data.reviewNote));
      } catch (err: any) {
        return reply.code(err.statusCode || 403).send({ error: err.message });
      }
    }
  );

  // ── CAUSE CRUD ────────────────────────────────
  
  app.get('/admin/causes', 
    { preHandler: requireAdmin }, 
    async (req, reply) => {
      try {
        const adminId = (req.session as any).userId;
        return reply.send(await causeService.getAdminCauses(adminId));
      } catch (err: any) {
        return reply.code(err.statusCode || 403).send({ error: err.message });
      }
    }
  );

  app.post('/admin/causes', 
    { preHandler: requireAdmin }, 
    async (req, reply) => {
      try {
        const adminId = (req.session as any).userId;
        const data = createCauseSchema.parse(req.body);
        return reply.code(201).send(await causeService.createCause(adminId, data));
      } catch (err: any) {
        return reply.code(err.statusCode || 403).send({ error: err.message });
      }
    }
  );

  app.patch('/admin/causes/:id', 
    { preHandler: requireAdmin }, 
    async (req, reply) => {
      try {
        const adminId = (req.session as any).userId;
        const { id } = req.params as { id: string };
        const data = updateCauseSchema.parse(req.body);
        return reply.send(await causeService.updateCause(adminId, id, data));
      } catch (err: any) {
        return reply.code(err.statusCode || 403).send({ error: err.message });
      }
    }
  );

  // ── SUBMIT JOIN REQUEST ───────────────────────
  
  app.post('/admin/causes/:causeId/join-requests', 
    { preHandler: requireAdmin }, 
    async (req, reply) => {
      try {
        const adminId = (req.session as any).userId;
        const { causeId } = req.params as { causeId: string };
        const data = joinRequestSchema.parse(req.body);
        return reply.code(201).send(await causeService.submitJoinRequest(adminId, causeId, data));
      } catch (err: any) {
        return reply.code(err.statusCode || 403).send({ error: err.message });
      }
    }
  );

  // ── FAQ ──────────────────────────────────────
  
  app.post('/admin/causes/:id/faqs', 
    { preHandler: requireAdmin }, 
    async (req, reply) => {
      try {
        const adminId = (req.session as any).userId;
        const { id } = req.params as { id: string };
        const data = faqSchema.parse(req.body);
        return reply.code(201).send(await causeService.addFaq(adminId, id, data));
      } catch (err: any) {
        return reply.code(err.statusCode || 403).send({ error: err.message });
      }
    }
  );
}