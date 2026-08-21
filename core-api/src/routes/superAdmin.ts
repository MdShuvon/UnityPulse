import { FastifyInstance }        from 'fastify';
import { localAdminService } from '../services/localAdminService';
import { requireSuperAdmin } from '../middleware/authGuard';
import { reviewApplicationSchema, revokeSchema, auditFilterSchema } from '../schemas/phase8Schema';

export async function superAdminRoutes(app: FastifyInstance) {

  app.get('/superadmin/applications', { preHandler: requireSuperAdmin }, async (req, reply) =>
    reply.send(await localAdminService.getPendingApplications())
  );

  app.patch('/superadmin/applications/:id', { preHandler: requireSuperAdmin }, async (req, reply) => {
    const superAdminId       = (req.session as any).userId;
    const { id }             = req.params as any;
    const { action, reason } = reviewApplicationSchema.parse(req.body);

    if (action === 'APPROVE') return reply.send(await localAdminService.approveApplication(superAdminId, id));
    return reply.send(await localAdminService.rejectApplication(superAdminId, id, reason!));
  });

  app.get('/superadmin/local-admins', { preHandler: requireSuperAdmin }, async (req, reply) =>
    reply.send(await localAdminService.getLocalAdmins())
  );

  app.delete('/superadmin/local-admins/:userId/revoke', { preHandler: requireSuperAdmin }, async (req, reply) => {
    const { reason } = revokeSchema.parse(req.body);
    return reply.send(
      await localAdminService.revokeLocalAdmin((req.session as any).userId, (req.params as any).userId, reason)
    );
  });

  app.get('/superadmin/audit', { preHandler: requireSuperAdmin }, async (req, reply) =>
    reply.send(await localAdminService.getAuditLog(auditFilterSchema.parse(req.query)))
  );
}