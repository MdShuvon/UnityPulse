import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { requireAdmin, requireSuperAdmin } from '../../middleware/authGuard';

export async function adminUserRoutes(app: FastifyInstance) {

  // GET /admin/users - paginated, filtered, scoped
  app.get('/admin/users',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const adminId = (req.session as any).userId;
      const { role, search, page = '1', pageSize = '20' } = req.query as any;
      
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { role: true },
      });

      const where: any = {};
      
      // LOCAL_ADMIN scoping - only own org members
      if (admin?.role === 'LOCAL_ADMIN') {
        const adminOrg = await prisma.organization.findFirst({ where: { adminId } });
        if (!adminOrg) throw new Error('Organization পাওয়া যায়নি');
        where.areaId = adminOrg.areaId;
      }

      if (role && role !== 'ALL') {
        where.role = role;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const offset = (Math.max(1, +page) - 1) * Math.max(1, +pageSize);

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profilePhoto: true,
            accountStatus: true,
            suspensionReason: true,
            suspendedAt: true,
            createdAt: true,
            area: { select: { name: true } },
            points: {
              select: { amount: true, reason: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: Math.max(1, +pageSize),
        }),
        prisma.user.count({ where }),
      ]);

      // Calculate total points
      const usersWithPoints = users.map(user => {
        const totalPoints = user.points.reduce((sum, p) => sum + p.amount, 0);
        return { ...user, totalPoints, points: undefined };
      });

      return {
        data: usersWithPoints,
        pagination: {
          page: Math.max(1, +page),
          pageSize: Math.max(1, +pageSize),
          total,
          hasMore: offset + users.length < total,
        },
      };
    }
  );

  // GET /admin/users/:id - user detail
  app.get('/admin/users/:id',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const { id } = req.params as any;
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          bio: true,
          profilePhoto: true,
          address: true,
          occupation: true,
          dateOfBirth: true,
          gender: true,
          accountStatus: true,
          suspendedAt: true,
          suspensionReason: true,
          createdAt: true,
          area: { select: { name: true } },
        },
      });
      
      if (!user) return reply.code(404).send({ error: 'User পাওয়া যায়নি' });
      return reply.send(user);
    }
  );

  // PATCH /admin/users/:id/role - only SUPER_ADMIN
  app.patch('/admin/users/:id/role',
    { preHandler: requireSuperAdmin },
    async (req, reply) => {
      const { id } = req.params as any;
      const { role } = req.body as any;
      
      if (!['SUPER_ADMIN', 'LOCAL_ADMIN', 'MEMBER'].includes(role)) {
        return reply.code(400).send({ error: 'Invalid role' });
      }

      await prisma.user.update({
        where: { id },
        data: { role },
      });

      return { message: 'Role updated' };
    }
  );

  // PATCH /admin/users/:id/status - suspend/reactivate
  app.patch('/admin/users/:id/status',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const adminId = (req.session as any).userId;
      const { id } = req.params as any;
      const { status, reason } = req.body as any;
      
      if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
        return reply.code(400).send({ error: 'Invalid status' });
      }

      if (status === 'SUSPENDED' && (!reason || !reason.trim())) {
        return reply.code(400).send({ error: 'Suspend reason required' });
      }

      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { role: true },
      });

      // LOCAL_ADMIN can only suspend own org members
      if (admin?.role === 'LOCAL_ADMIN') {
        const adminOrg = await prisma.organization.findFirst({ where: { adminId } });
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!adminOrg || !targetUser || targetUser.areaId !== adminOrg.areaId) {
          return reply.code(403).send({ error: 'Permission denied' });
        }
      }

      await prisma.user.update({
        where: { id },
        data: {
          accountStatus: status,
          suspendedAt: status === 'SUSPENDED' ? new Date() : null,
          suspendedBy: status === 'SUSPENDED' ? adminId : null,
          suspensionReason: status === 'SUSPENDED' ? reason : null,
        },
      });

      // Invalidate Redis cache
      await redis.del(`user_status:${id}`);

      return { message: `User ${status}` };
    }
  );
}