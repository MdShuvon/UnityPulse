import { FastifyInstance }       from 'fastify';
import { notificationService }  from '../services/notificationService';
import { notificationEmitter }  from '../lib/redis';
import { requireAuth }          from '../middleware/authGuard';

export async function notificationRoutes(app: FastifyInstance) {

  app.get('/notifications', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req.session as any).userId;
    const { limit = '20', page = '1' } = req.query as any;
    return reply.send(await notificationService.getNotifications(userId, Math.max(1, +limit), Math.max(1, +page)));
  });

  app.get('/notifications/count', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req.session as any).userId;
    return reply.send({ unreadCount: await notificationService.getUnreadCount(userId) });
  });

  // Bug 1 fix: EventEmitter — no redis.duplicate() per user
  app.get('/notifications/live', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req.session as any).userId;

    reply.raw.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Initial count
    const count = await notificationService.getUnreadCount(userId);
    reply.raw.write(`data: ${JSON.stringify({ unreadCount: count })}\n\n`);

    const keepAlive = setInterval(() => reply.raw.write(': ping\n\n'), 30000);

    // EventEmitter — single Redis connection handle করে, no new connection per user
    const handler = (data: any) => reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    notificationEmitter.on(`user:${userId}`, handler);

    req.raw.on('close', () => {
      clearInterval(keepAlive);
      notificationEmitter.off(`user:${userId}`, handler);
    });
  });

  app.patch('/notifications/:id/read', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req.session as any).userId;
    return reply.send(await notificationService.markRead(userId, (req.params as any).id));
  });

  app.patch('/notifications/read-all', { preHandler: requireAuth }, async (req, reply) => {
    return reply.send(await notificationService.markAllRead((req.session as any).userId));
  });
}