import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';

// যেকোনো logged-in user
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req.session as any)?.userId;
  if (!userId) return reply.code(401).send({ error: 'Login করো আগে' });
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