import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
export type PointReason = 'DONATION' | 'TASK';

export class PointService {

   async add(userId: string, amount: number, reason: PointReason, refId: string) {
    await prisma.pointLedger.create({
      data: { userId, amount, reason, refId },
    });

    // Fix 3: SET থেকে keys নাও — redis.keys() নয়
    const keys = await redis.smembers('lb:cache-keys');
    if (keys.length > 0) {
      await redis.del(...keys);
      await redis.del('lb:cache-keys'); // SET নিজেও clear করো
    }
  }

  async getTotal(userId: string, reason?: PointReason): Promise<number> {
    const result = await prisma.pointLedger.aggregate({
      where: { userId, ...(reason ? { reason } : {}) },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  async getDonationLeaderboard(limit = 10) {
    return prisma.pointLedger.groupBy({
      by: ['userId'],
      where: { reason: 'DONATION' },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });
  }

  async getTaskLeaderboard(limit = 10) {
    return prisma.pointLedger.groupBy({
      by: ['userId'],
      where: { reason: 'TASK' },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });
  }

  // Org score = weighted formula
  // donation×0.4 + task×0.3 + member×0.2 + activeDays×0.1
  async getOrgScore(orgId: string): Promise<number> {
    // TODO Phase 5 এ implement হবে
    return 0;
  }
}

export const pointService = new PointService();