import { FastifyInstance } from 'fastify';
import { orgService } from '../../services/orgService';
import { reviewKycSchema } from '../../schemas/orgSchema';
import { requireAdmin } from '../../middleware/authGuard';

export async function adminKycRoutes(app: FastifyInstance) {

  // GET /admin/kyc/pending — pending list
  app.get('/admin/kyc/pending',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const adminId = (req.session as any).userId;
      return reply.send(await orgService.getPendingKyc(adminId));
    }
  );

  // PATCH /admin/kyc/:id — approve বা reject
  app.patch('/admin/kyc/:id',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const adminId      = (req.session as any).userId;
      const { id }       = req.params as { id: string };
      const { action, note } = reviewKycSchema.parse(req.body);
      const result       = await orgService.reviewKyc(adminId, id, action, note);
      return reply.send(result);
    }
  );

  // GET /admin/kyc/:id/nid — NID number decrypt করে দেখাও
  app.get('/admin/kyc/:id/nid',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const adminId = (req.session as any).userId;
      const { id }  = req.params as { id: string };
      return reply.send(await orgService.getDecryptedNid(adminId, id));
    }
  );
}