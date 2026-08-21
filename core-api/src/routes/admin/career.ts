import { FastifyInstance }    from 'fastify';
import { careerService }       from '../../services/careerService';
import { requireAdmin }        from '../../middleware/authGuard';
import { createJobSchema, updateJobSchema, reviewApplicationSchema } from '../../schemas/careerSchema';

export async function adminCareerRoutes(app: FastifyInstance) {

  // POST /admin/career/jobs
  app.post('/admin/career/jobs', { preHandler: requireAdmin }, async (req, reply) => {
    const data = createJobSchema.parse(req.body);
    return reply.code(201).send(await careerService.createJob((req.session as any).userId, data));
  });

  // GET /admin/career/jobs
  app.get('/admin/career/jobs', { preHandler: requireAdmin }, async (req, reply) => {
    return reply.send(await careerService.getAllJobsAdmin((req.session as any).userId));
  });

  // PATCH /admin/career/jobs/:id
  app.patch('/admin/career/jobs/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const data = updateJobSchema.parse(req.body);
    return reply.send(await careerService.updateJob((req.session as any).userId, (req.params as any).id, data));
  });

  // GET /admin/career/jobs/:id/applications
  app.get('/admin/career/jobs/:id/applications', { preHandler: requireAdmin }, async (req, reply) => {
    return reply.send(await careerService.getJobApplications((req.params as any).id, (req.session as any).userId));
  });

  // GET /admin/career/applications/:id/cv — presigned URL (Fix 5)
  app.get('/admin/career/applications/:id/cv', { preHandler: requireAdmin }, async (req, reply) => {
    return reply.send(await careerService.getCvPresignedUrl((req.params as any).id, (req.session as any).userId));
  });

  // PATCH /admin/career/applications/:id — accept/reject (Fix 6)
  app.patch('/admin/career/applications/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { action, note } = reviewApplicationSchema.parse(req.body);
    return reply.send(await careerService.reviewApplication((req.session as any).userId, (req.params as any).id, action, note));
  });
}