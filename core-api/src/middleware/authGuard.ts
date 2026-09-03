import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

// যেকোনো logged-in user
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req.session as any)?.userId;
  if (!userId) return reply.code(401).send({ error: 'Login করো আগে' });

  // Check Redis cache for account status
  const cachedStatus = await redis.get(`user_status:${userId}`);
  if (cachedStatus === 'SUSPENDED') {
    return reply.code(403).send({ error: 'Account suspended' });
  }

  if (!cachedStatus) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountStatus: true },
    });
    
    if (user?.accountStatus === 'SUSPENDED') {
      await redis.set(`user_status:${userId}`, 'SUSPENDED', 'EX', 60);
      return reply.code(403).send({ error: 'Account suspended' });
    }
    
    await redis.set(`user_status:${userId}`, 'ACTIVE', 'EX', 60);
  }
}

// LOCAL_ADMIN বা SUPER_ADMIN
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req.session as any)?.userId;
  if (!userId) return reply.code(401).send({ error: 'Login করো' });

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { role: true },
  });
  if (!user || !['LOCAL_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return reply.code(403).send({ error: 'Admin access দরকার' });
  }
}

// শুধু SUPER_ADMIN
export async function requireSuperAdmin(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req.session as any)?.userId;
  if (!userId) return reply.code(401).send({ error: 'Login করো' });

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { role: true },
  });
  if (user?.role !== 'SUPER_ADMIN') {
    return reply.code(403).send({ error: 'Super admin access required' });
  }
}