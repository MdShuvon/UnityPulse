import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';

export async function searchRoutes(app: FastifyInstance) {

  app.get('/search/all', async (req, reply) => {
    const { q } = req.query as { q?: string };
    
    if (!q || q.trim().length < 2) {
      return reply.send({ causes: [], projects: [], jobs: [] });
    }

    const query = q.trim();

    // Search Causes (ACTIVE)
    const causes = await prisma.cause.findMany({
      where: {
        status: 'ACTIVE',
        title: { contains: query, mode: 'insensitive' },
      },
      take: 3,
      select: { id: true, title: true, coverImage: true },
    });

    // Search Donation Projects (active)
    const projects = await prisma.donationProject.findMany({
      where: {
        status: 'active',
        title: { contains: query, mode: 'insensitive' },
      },
      take: 3,
      select: { id: true, title: true, coverImage: true, org: { select: { name: true } } },
    });

    // Search Jobs (OPEN)
    const jobs = await prisma.jobPost.findMany({
      where: {
        status: 'OPEN',
        title: { contains: query, mode: 'insensitive' },
      },
      take: 3,
      select: { id: true, title: true, department: true },
    });

    return reply.send({ causes, projects, jobs });
  });
}