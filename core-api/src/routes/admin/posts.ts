import { FastifyInstance }  from 'fastify';
import { postService }       from '../../services/postService';
import { requireAdmin }      from '../../middleware/authGuard';
import { handleReportSchema } from '../../schemas/postSchema';

export async function adminPostRoutes(app: FastifyInstance) {

  app.get('/admin/posts/reports', { preHandler: requireAdmin }, async (req, reply) => {
    return reply.send(await postService.getModerationQueue());
  });

  app.patch('/admin/posts/reports/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const adminId          = (req.session as any).userId;
    const { action, note } = handleReportSchema.parse(req.body);
    return reply.send(await postService.handleReport(adminId, (req.params as any).id, action, note));
  });

  app.patch('/admin/posts/:id/restore', { preHandler: requireAdmin }, async (req, reply) => {
    return reply.send(await postService.restorePost((req.session as any).userId, (req.params as any).id));
  });
}