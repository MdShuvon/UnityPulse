import { FastifyInstance } from 'fastify';
import { taskService }     from '../services/taskService';
import { taskEmitter }     from '../lib/redis';
import { requireAuth }     from '../middleware/authGuard';

export async function taskRoutes(app: FastifyInstance) {

  // GET /tasks/feed
  app.get('/tasks/feed', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req.session as any).userId;
    return reply.send(await taskService.getMemberFeed(userId));
  });

  // GET /tasks/feed/live — SSE
  app.get('/tasks/feed/live', async (req, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    const keepAlive = setInterval(() => reply.raw.write(': ping\n\n'), 30000);
    const handler   = (data: any) =>
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    taskEmitter.on('new', handler);
    req.raw.on('close', () => { clearInterval(keepAlive); taskEmitter.off('new', handler); });
  });

  // POST /tasks/:id/submit
  // Fix 5: Parts iterate করার সময়ই Buffer এ convert
  app.post('/tasks/:id/submit', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req.session as any).userId;
    const { id } = req.params as { id: string };

    const bufferedFiles: Array<{ buffer: Buffer; mimetype: string; filename: string }> = [];
    const parts = req.parts();

    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'photos') {
        if (bufferedFiles.length >= 5) {
          // Extra files drain করো
          for await (const _ of part.file) {}
          continue;
        }
        // Stream এখনই buffer করো
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        bufferedFiles.push({
          buffer:   Buffer.concat(chunks),
          mimetype: part.mimetype,
          filename: part.filename,
        });
      }
    }

    if (bufferedFiles.length === 0)
      return reply.code(400).send({ error: 'কমপক্ষে ১টা photo দাও' });

    const result = await taskService.submitProof(userId, id, bufferedFiles);
    return reply.code(201).send(result);
  });

  // GET /tasks/my-submissions
  app.get('/tasks/my-submissions', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req.session as any).userId;
    return reply.send(await taskService.getMySubmissions(userId));
  });
}