import { FastifyInstance }  from 'fastify';
import { taskService }       from '../../services/taskService';
import { requireAdmin }      from '../../middleware/authGuard';
import { createTaskSchema, reviewSubmissionSchema } from '../../schemas/taskSchema';

export async function adminTaskRoutes(app: FastifyInstance) {

  app.post('/admin/tasks', { preHandler: requireAdmin }, async (req, reply) => {
    const adminId = (req.session as any).userId;
    const data    = createTaskSchema.parse(req.body);
    return reply.code(201).send(await taskService.createTask(adminId, data));
  });

  app.get('/admin/tasks', { preHandler: requireAdmin }, async (req, reply) => {
    const adminId = (req.session as any).userId;
    return reply.send(await taskService.getAdminTasks(adminId));
  });

  app.get('/admin/tasks/submissions', { preHandler: requireAdmin }, async (req, reply) => {
    const adminId = (req.session as any).userId;
    return reply.send(await taskService.getPendingSubmissions(adminId));
  });

  app.patch('/admin/tasks/submissions/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const adminId          = (req.session as any).userId;
    const { id }           = req.params as { id: string };
    const { action, note } = reviewSubmissionSchema.parse(req.body);
    return reply.send(await taskService.reviewSubmission(adminId, id, action, note));
  });

    // PATCH /admin/tasks/:id — task status toggle (OPEN/CLOSED)
  app.patch('/admin/tasks/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const adminId = (req.session as any).userId;
    const { id } = req.params as { id: string };
    const { status } = req.body as any;
    
    if (!['OPEN', 'CLOSED'].includes(status)) {
      return reply.code(400).send({ error: 'Invalid status' });
    }
    
    const task = await taskService.getAdminTasks(adminId);
    const found = task.find(t => t.id === id);
    
    if (!found) {
      return reply.code(403).send({ error: 'Permission denied' });
    }
    
    const result = await taskService.updateTaskStatus(adminId, id, status);
    return reply.send(result);
  });
}