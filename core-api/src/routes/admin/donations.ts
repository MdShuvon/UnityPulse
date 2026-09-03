import { FastifyInstance }  from 'fastify';
import { donationService }  from '../../services/donationService';
import { requireAdmin }     from '../../middleware/authGuard';
import { randomUUID } from 'crypto';
import { minioClient, BUCKET } from '../../lib/minio';
import {
  createProjectSchema,
  updateProjectSchema,
  addExpenseSchema,
} from '../../schemas/donationSchema';

export async function adminDonationRoutes(app: FastifyInstance) {

  const UPLOAD_RULES: Record<string, { folder: string; allowedTypes: string[]; maxSizeMB: number }> = {
  'donation-cover': { folder: 'cover', allowedTypes: ['image/jpeg', 'image/png', 'image/webp'], maxSizeMB: 5 },
};

function getExtensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  return map[contentType] || 'bin';
}

// POST /admin/uploads/presign
app.post('/admin/uploads/presign',
  { preHandler: requireAdmin },
  async (req, reply) => {
    const { purpose, contentType } = req.body as any;

    const rule = UPLOAD_RULES[purpose];
    if (!rule) {
      return reply.code(400).send({ error: 'Invalid purpose' });
    }

    if (!rule.allowedTypes.includes(contentType)) {
      return reply.code(400).send({ error: 'Invalid content type' });
    }

    const ext = getExtensionFromContentType(contentType);
    const key = `${rule.folder}/${randomUUID()}.${ext}`;

    const uploadUrl = await minioClient.presignedPutObject(BUCKET, key, 10 * 60);
    const publicUrl = `http://localhost:9000/${BUCKET}/${key}`;

    return reply.send({ uploadUrl, publicUrl });
  }
);

  // POST /admin/donations/projects — নতুন project
  app.post('/admin/donations/projects',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const adminId = (req.session as any).userId;
      const data    = createProjectSchema.parse(req.body);
      const project = await donationService.createProject(adminId, data);
      return reply.code(201).send(project);
    }
  );

  // GET /admin/donations/projects — নিজের সব project
  app.get('/admin/donations/projects',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const adminId  = (req.session as any).userId;
      const projects = await donationService.getAdminProjects(adminId);
      return reply.send(projects);
    }
  );

  // PATCH /admin/donations/projects/:id — update বা close
  app.patch('/admin/donations/projects/:id',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const adminId = (req.session as any).userId;
      const { id }  = req.params as { id: string };
      const data    = updateProjectSchema.parse(req.body);
      const result  = await donationService.updateProject(adminId, id, data);
      return reply.send(result);
    }
  );

  // POST /admin/donations/projects/:id/expenses — expense add
  app.post('/admin/donations/projects/:id/expenses',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const adminId = (req.session as any).userId;
      const { id }  = req.params as { id: string };
      const data    = addExpenseSchema.parse(req.body);
      const result  = await donationService.addExpense(adminId, id, data);
      return reply.code(201).send(result);
    }
  );
    // GET /admin/donations/ledger — filtered donation ledger
  app.get('/admin/donations/ledger',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const adminId = (req.session as any).userId;
      const { projectId, startDate, endDate } = req.query as any;
      
      const result = await donationService.getDonationLedger(adminId, {
        projectId,
        startDate,
        endDate,
      });
      
      return reply.send(result);
    }
  );
}