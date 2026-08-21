import { prisma } from '../lib/prisma';
import { redis }  from '../lib/redis';

const STATS_TTL      = 300; // 5 minutes
const HIGHLIGHTS_TTL = 60;  // 1 minute

export class DashboardService {

  async getStats() {
    const cacheKey = 'dashboard:stats';
    const cached   = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [uniqueDonorData, totalDonations, activeOrgs, activeProjects, verifiedMembers] =
      await Promise.all([
        // Bug 2 fix: Donation এ status নেই — all donations count করো
        prisma.donation.findMany({
          select:   { userId: true },
          distinct: ['userId'],
          where:    { userId: { not: null } }, // guest donations বাদ — শুধু member donors
        }),
        prisma.donation.count(),              // সব donations (guest + member)
        prisma.organization.count({ where: { isActive: true } }),
        // Bug 2 fix: lowercase 'active' — schema definition অনুযায়ী
        prisma.donationProject.count({ where: { status: 'active' } }),
        prisma.user.count({ where: { isVerified: true, role: 'MEMBER' } }),
      ]);

    const result = {
      uniqueMemberDonors: uniqueDonorData.length,
      totalDonations,
      activeOrgs,
      activeProjects,
      verifiedMembers,
      cachedAt: new Date().toISOString(),
    };

    await redis.set(cacheKey, JSON.stringify(result), 'EX', STATS_TTL);
    return result;
  }

  async getHighlights() {
    const cacheKey = 'dashboard:highlights';
    const cached   = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [pressHighlights, topTasks, careerSnippet] = await Promise.all([
      prisma.post.findMany({
        where:   { visibility: 'PUBLIC', isHidden: false, isDeleted: false },
        select:  {
          id: true, content: true, photos: true, createdAt: true, editedAt: true,
          user:   { select: { id: true, name: true, profilePhoto: true } },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        take:    3,
      }),
      prisma.task.findMany({
        where:   { status: 'OPEN' },
        select:  {
          id: true, title: true, pointValue: true, date: true,
          org: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take:    4,
      }),
      // Bug 2 fix: isOpen নেই → status: 'OPEN'
      prisma.jobPost.findMany({
        where:   { status: 'OPEN' },
        select:  { id: true, title: true, applicationFee: true, deadline: true },
        orderBy: { createdAt: 'desc' },
        take:    2,
      }),
    ]);

    const result = { pressHighlights, topTasks, careerSnippet };
    await redis.set(cacheKey, JSON.stringify(result), 'EX', HIGHLIGHTS_TTL);
    return result;
  }

  // Polling endpoint — NOT SSE (connection flood prevent)
  async getLiveTransactions() {
    return prisma.donation.findMany({
      select: {
        id: true, amount: true, method: true, createdAt: true,
        guestName: true,
        user:    { select: { name: true, profilePhoto: true } },
        project: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take:    2,
    });
  }

  async invalidateStats()      { await redis.del('dashboard:stats'); }
  async invalidateHighlights() { await redis.del('dashboard:highlights'); }
}

export const dashboardService = new DashboardService();