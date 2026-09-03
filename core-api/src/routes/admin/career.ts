import { FastifyInstance }    from 'fastify';
import { careerService }       from '../../services/careerService';
import { requireAdmin }        from '../../middleware/authGuard';
import { createJobSchema, updateJobSchema } from '../../schemas/careerSchema';

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

  // GET /admin/career/applications — pending applications (scoped)
  app.get('/admin/career/applications',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const adminId = (req.session as any).userId;
      const applications = await careerService.getPendingApplications(adminId);
      return reply.send(applications);
    }
  );

  // GET /admin/career/applications/:id/cv — presigned CV URL (5 min expiry)
  app.get('/admin/career/applications/:id/cv',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const adminId = (req.session as any).userId;
      const { id } = req.params as any;
      const result = await careerService.getCvPresignedUrlAdmin(id, adminId);
      return reply.send(result);
    }
  );

  // POST /admin/career/applications/:id/review — accept/reject
  app.post('/admin/career/applications/:id/review',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const adminId = (req.session as any).userId;
      const { id } = req.params as any;
      const { action, note } = req.body as any;
      
      if (action === 'REJECTED' && (!note || !note.trim())) {
        return reply.code(400).send({ error: 'Reject এর কারণ লিখুন' });
      }
      
      const result = await careerService.reviewApplication(adminId, id, action, note);
      return reply.send(result);
    }
  );
}