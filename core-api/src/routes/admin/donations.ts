import { FastifyInstance }  from 'fastify';
import { donationService }  from '../../services/donationService';
import { requireAdmin }     from '../../middleware/authGuard';
import {
  createProjectSchema,
  updateProjectSchema,
  addExpenseSchema,
} from '../../schemas/donationSchema';

export async function adminDonationRoutes(app: FastifyInstance) {

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
}