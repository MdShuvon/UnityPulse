// core-api/src/routes/tasks.ts - UPDATED
import { prisma } from '../lib/prisma';
import { FastifyInstance } from 'fastify';
import { taskService } from '../services/taskService';
import { taskEmitter } from '../lib/redis';
import { requireAuth } from '../middleware/authGuard';

export async function taskRoutes(app: FastifyInstance) {
  
  // GET /tasks - Public listing with optional auth
  app.get('/tasks', async (req, reply) => {
    try {
      const userId = (req.session as any)?.userId || null;
      const tasks = await taskService.getPublicTasks(userId);
      return reply.send(tasks);
    } catch (error: any) {
      console.error('Error in GET /tasks:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  // GET /tasks/feed - Member feed (requires auth)
  app.get('/tasks/feed', { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = (req.session as any).userId;
      const tasks = await taskService.getMemberFeed(userId);
      return reply.send(tasks);
    } catch (error: any) {
      console.error('Error in GET /tasks/feed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  // GET /tasks/:id - Task detail with visibility check
  app.get('/tasks/:id', async (req, reply) => {
    try {
      const userId = (req.session as any)?.userId || null;
      const { id } = req.params as { id: string };
      
      const task = await taskService.getTaskDetail(id, userId);
      if (!task) {
        return reply.code(404).send({ error: 'Task পাওয়া যায়নি' });
      }
      
      return reply.send(task);
    } catch (error: any) {
      console.error('Error in GET /tasks/:id:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  // POST /tasks/:id/submit - Submit proof (requires auth)
  app.post('/tasks/:id/submit', { preHandler: requireAuth }, async (req, reply) => {
    try {
      const taskUserId = (req.session as any).userId;
      const { id: taskId } = req.params as { id: string };

      // Check task visibility
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return reply.code(404).send({ error: 'Task পাওয়া যায়নি' });
      }

      if (task.orgId) {
        const membership = await prisma.orgMembership.findFirst({
          where: { userId: taskUserId, orgId: task.orgId, status: 'APPROVED' },
        });
        if (!membership) {
          return reply.code(403).send({ error: 'এই task-এ submit করতে permission নেই' });
        }
      }

      // Handle file upload
      const bufferedFiles: Array<{ buffer: Buffer; mimetype: string; filename: string }> = [];
      const parts = req.parts();

      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'photos') {
          if (bufferedFiles.length >= 5) {
            for await (const _ of part.file) {}
            continue;
          }
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) chunks.push(chunk);
          bufferedFiles.push({
            buffer: Buffer.concat(chunks),
            mimetype: part.mimetype,
            filename: part.filename,
          });
        }
      }

      if (bufferedFiles.length === 0) {
        return reply.code(400).send({ error: 'কমপক্ষে ১টা photo দাও' });
      }

      const result = await taskService.submitProof(taskUserId, taskId, bufferedFiles);
      return reply.code(201).send(result);
    } catch (error: any) {
      console.error('Error in POST /tasks/:id/submit:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  // GET /tasks/feed/live - SSE
  app.get('/tasks/feed/live', async (req, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    
    const keepAlive = setInterval(() => reply.raw.write(': ping\n\n'), 30000);
    const handler = (data: any) => reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    
    taskEmitter.on('new', handler);
    req.raw.on('close', () => {
      clearInterval(keepAlive);
      taskEmitter.off('new', handler);
    });
  });
    // GET /tasks/mine - User's submissions (requires auth)
  app.get('/tasks/mine', { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = (req.session as any).userId;
      const submissions = await taskService.getMySubmissions(userId);
      return reply.send(submissions);
    } catch (error: any) {
      console.error('Error in GET /tasks/mine:', error);
      return reply.code(500).send({ error: error.message });
    }
  });
}