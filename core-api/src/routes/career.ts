import { FastifyInstance } from 'fastify';
import { careerService }   from '../services/careerService';
import { requireAuth }     from '../middleware/authGuard';

export async function careerRoutes(app: FastifyInstance) {

  // GET /career/jobs?q=&department=&type=&limit=&page=
  // Fix 8: Filter support
  app.get('/career/jobs', async (req, reply) => {
    const { q, department, type, limit = '20', page = '1' } = req.query as any;
    return reply.send(await careerService.getJobs({
      q, department, jobType: type,
      limit: Math.max(1, +limit),
      page:  Math.max(1, +page),
    }));
  });

  // GET /career/jobs/:id
  app.get('/career/jobs/:id', async (req, reply) => {
    return reply.send(await careerService.getJob((req.params as any).id));
  });

  // POST /career/jobs/:id/apply — CV + optional paymentRef
  app.post('/career/jobs/:id/apply',
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = (req.session as any).userId;
      const jobId  = (req.params as any).id;

      // File upload handle
      let cvFile: any = null;
      let paymentRef: string | undefined;

      for await (const part of req.parts()) {
        if (part.type === 'file' && part.fieldname === 'cv') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) chunks.push(chunk);
          cvFile = { buffer: Buffer.concat(chunks), mimetype: part.mimetype, filename: part.filename };
        } else if (part.type === 'field' && part.fieldname === 'paymentRef') {
          paymentRef = part.value as string;
        }
      }

      if (!cvFile) return reply.code(400).send({ error: 'CV file দাও (PDF)' });

      const result = await careerService.applyForJob(userId, jobId, cvFile, paymentRef);
      return reply.code(201).send(result);
    }
  );

  // GET /career/my-applications
  app.get('/career/my-applications', { preHandler: requireAuth }, async (req, reply) => {
    return reply.send(await careerService.getMyApplications((req.session as any).userId));
  });

  // GET /career/my-applications/:id/cv — presigned URL
  app.get('/career/my-applications/:id/cv', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req.session as any).userId;
    return reply.send(await careerService.getCvPresignedUrl((req.params as any).id, userId));
  });
}