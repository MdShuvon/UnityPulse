// core-api/src/services/leaderboardService.ts
import { prisma } from '../lib/prisma';
import { redis }  from '../lib/redis';
import { PointReason } from '../constants/status';

const CACHE_TTL      = 300;
const CACHE_KEYS_SET = 'lb:cache-keys';

async function cacheSet(key: string, data: any) {
  await redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL);
  await redis.sadd(CACHE_KEYS_SET, key);
}

export function getBadge(rank: number): string {
  if (rank === 1)  return 'Legend';
  if (rank <= 3)   return 'Champion';
  if (rank <= 10)  return 'Elite';
  if (rank <= 50)  return 'Star';
  if (rank <= 100) return 'Active';
  return 'Newcomer';
}

async function enrichWithUsers(
  raw: Array<{ userId: string; _sum: { amount: number | null } }>,
  offset: number
) {
  const userIds = raw.map(r => r.userId);
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: { id: true, name: true, profilePhoto: true },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  return raw.map((r, i) => {
    const rank = offset + i + 1;
    return {
      rank,
      badge:       getBadge(rank),
      totalPoints: r._sum.amount ?? 0,
      user:        userMap[r.userId] ?? null,
    };
  });
}

async function countDistinctUsers(reason: PointReason, orgMemberIds?: string[]) {
  return prisma.pointLedger.findMany({
    where: {
      reason,
      ...(orgMemberIds ? { userId: { in: orgMemberIds } } : {}),
    },
    select:   { userId: true },
    distinct: ['userId'],
  }).then(r => r.length);
}

export class LeaderboardService {

  async getDonationLeaderboard(limit = 20, page = 1) {
    const cacheKey = `lb:donation:${limit}:${page}`;
    const cached   = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const offset = (page - 1) * limit;
    const total  = await countDistinctUsers(PointReason.DONATION);

    const raw = await prisma.pointLedger.groupBy({
      by:      ['userId'],
      where:   { reason: PointReason.DONATION },
      _sum:    { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      skip:    offset,
      take:    limit,
    });

    const data   = await enrichWithUsers(raw as any, offset);
    const result = { data, pagination: { page, limit, total, hasMore: offset + raw.length < total } };

    await cacheSet(cacheKey, result);
    return result;
  }

  async getTaskLeaderboard(limit = 20, page = 1) {
    const cacheKey = `lb:task:${limit}:${page}`;
    const cached   = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const offset = (page - 1) * limit;
    const total  = await countDistinctUsers(PointReason.TASK);

    const raw = await prisma.pointLedger.groupBy({
      by:      ['userId'],
      where:   { reason: PointReason.TASK },
      _sum:    { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      skip:    offset,
      take:    limit,
    });

    const userIds = raw.map(r => r.userId);
    const users   = await prisma.user.findMany({
      where:  { id: { in: userIds } },
      select: { id: true, name: true, profilePhoto: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const taskCounts = await prisma.taskSubmission.groupBy({
      by:    ['userId'],
      where: { userId: { in: userIds }, status: 'APPROVED' },
      _count: { id: true },
    });
    const tcMap = Object.fromEntries(taskCounts.map(t => [t.userId, t._count.id]));

    const data = raw.map((r, i) => {
      const rank = offset + i + 1;
      return {
        rank,
        badge:       getBadge(rank),
        totalPoints: r._sum.amount ?? 0,
        taskCount:   tcMap[r.userId] ?? 0,
        user:        userMap[r.userId] ?? null,
      };
    });

    const result = { data, pagination: { page, limit, total, hasMore: offset + raw.length < total } };
    await cacheSet(cacheKey, result);
    return result;
  }

  async getOrgLeaderboard(limit = 20) {
    const cacheKey = `lb:org:${limit}`;
    const cached   = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const orgs = await prisma.organization.findMany({
      where:   { isActive: true },
      include: {
        memberships:      { where: { status: 'APPROVED' }, select: { userId: true } },
        donationProjects: { select: { collectedAmount: true } },
        area:             { select: { id: true, name: true } },
      },
    });

    const allMemberIds = [...new Set(
      orgs.flatMap(o => o.memberships.map(m => m.userId))
    )];
    const allTaskPoints = allMemberIds.length > 0
      ? await prisma.pointLedger.groupBy({
          by:    ['userId'],
          where: { userId: { in: allMemberIds }, reason: PointReason.TASK },
          _sum:  { amount: true },
        })
      : [];
    const taskPointMap = Object.fromEntries(
      allTaskPoints.map(t => [t.userId, t._sum.amount ?? 0])
    );

    const scored = orgs.map(org => {
      const totalDonation = org.donationProjects.reduce((s, p) => s + p.collectedAmount, 0);
      const donationScore = totalDonation / 1000;

      const taskPoints = org.memberships.reduce(
        (s, m) => s + (taskPointMap[m.userId] ?? 0), 0
      ) * 10;

      const memberScore = org.memberships.length * 50;
      const score       = donationScore * 0.4 + taskPoints * 0.3 + memberScore * 0.3;

      return {
        org: { id: org.id, name: org.name, area: org.area, memberCount: org.memberships.length },
        breakdown: { totalDonation, taskPoints: taskPoints / 10, memberCount: org.memberships.length },
        score: Math.round(score),
      };
    });

    const ranked = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s, i) => ({ rank: i + 1, ...s }));

    await cacheSet(cacheKey, ranked);
    return ranked;
  }

  async getOrgDonationLeaderboard(orgId: string, limit = 20, page = 1) {
    const cacheKey = `lb:org-don:${orgId}:${limit}:${page}`;
    const cached   = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const memberships = await prisma.orgMembership.findMany({
      where:  { orgId, status: 'APPROVED' },
      select: { userId: true },
    });
    const memberIds = memberships.map(m => m.userId);
    if (memberIds.length === 0) return { data: [], pagination: { page, limit, total: 0, hasMore: false } };

    const offset = (page - 1) * limit;
    const total  = await countDistinctUsers(PointReason.DONATION, memberIds);

    const raw = await prisma.pointLedger.groupBy({
      by:      ['userId'],
      where:   { userId: { in: memberIds }, reason: PointReason.DONATION },
      _sum:    { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      skip:    offset,
      take:    limit,
    });

    const data   = await enrichWithUsers(raw as any, offset);
    const result = { data, pagination: { page, limit, total, hasMore: offset + raw.length < total } };
    await cacheSet(cacheKey, result);
    return result;
  }

  async getOrgTaskLeaderboard(orgId: string, limit = 20, page = 1) {
    const cacheKey = `lb:org-task:${orgId}:${limit}:${page}`;
    const cached   = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const memberships = await prisma.orgMembership.findMany({
      where:  { orgId, status: 'APPROVED' },
      select: { userId: true },
    });
    const memberIds = memberships.map(m => m.userId);
    if (memberIds.length === 0) return { data: [], pagination: { page, limit, total: 0, hasMore: false } };

    const offset = (page - 1) * limit;
    const total  = await countDistinctUsers(PointReason.TASK, memberIds);

    const raw = await prisma.pointLedger.groupBy({
      by:      ['userId'],
      where:   { userId: { in: memberIds }, reason: PointReason.TASK },
      _sum:    { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      skip:    offset,
      take:    limit,
    });

    const data   = await enrichWithUsers(raw as any, offset);
    const result = { data, pagination: { page, limit, total, hasMore: offset + raw.length < total } };
    await cacheSet(cacheKey, result);
    return result;
  }

  async getMyRank(userId: string) {
    const myDonPts = await prisma.pointLedger.aggregate({
      where: { userId, reason: PointReason.DONATION }, _sum: { amount: true },
    });
    const myDonPoints = myDonPts._sum.amount ?? 0;

    const donAhead = await prisma.pointLedger.groupBy({
      by:     ['userId'],
      where:  { reason: PointReason.DONATION },
      _sum:   { amount: true },
      having: { amount: { _sum: { gt: myDonPoints } } },
    });
    const donationRank  = myDonPoints > 0 ? donAhead.length + 1 : null;
    const donationTotal = await countDistinctUsers(PointReason.DONATION);

    const myTaskPts = await prisma.pointLedger.aggregate({
      where: { userId, reason: PointReason.TASK }, _sum: { amount: true },
    });
    const myTaskPoints = myTaskPts._sum.amount ?? 0;

    const taskAhead = await prisma.pointLedger.groupBy({
      by:     ['userId'],
      where:  { reason: PointReason.TASK },
      _sum:   { amount: true },
      having: { amount: { _sum: { gt: myTaskPoints } } },
    });
    const taskRank  = myTaskPoints > 0 ? taskAhead.length + 1 : null;
    const taskTotal = await countDistinctUsers(PointReason.TASK);

    const taskCount = await prisma.taskSubmission.count({
      where: { userId, status: 'APPROVED' },
    });

    return {
      global: {
        donation: {
          rank: donationRank, points: myDonPoints,
          badge: donationRank ? getBadge(donationRank) : 'Newcomer',
          totalParticipants: donationTotal,
        },
        task: {
          rank: taskRank, points: myTaskPoints,
          badge: taskRank ? getBadge(taskRank) : 'Newcomer',
          taskCount, totalParticipants: taskTotal,
        },
      },
    };
  }

  async getMyOrgRank(userId: string) {
    const membership = await prisma.orgMembership.findFirst({
      where:   { userId, status: 'APPROVED' },
      include: { org: { select: { id: true, name: true } } },
    });
    if (!membership) throw new Error('তুমি কোনো org এর approved member নও');

    const orgId = membership.orgId;
    const memberships = await prisma.orgMembership.findMany({
      where:  { orgId, status: 'APPROVED' },
      select: { userId: true },
    });
    const memberIds = memberships.map(m => m.userId);

    const myDonPts = await prisma.pointLedger.aggregate({
      where: { userId, reason: PointReason.DONATION }, _sum: { amount: true },
    });
    const myDonPoints = myDonPts._sum.amount ?? 0;

    const donAheadInOrg = await prisma.pointLedger.groupBy({
      by:     ['userId'],
      where:  { userId: { in: memberIds }, reason: PointReason.DONATION },
      _sum:   { amount: true },
      having: { amount: { _sum: { gt: myDonPoints } } },
    });
    const orgDonRank  = myDonPoints > 0 ? donAheadInOrg.length + 1 : null;
    const orgDonTotal = await countDistinctUsers(PointReason.DONATION, memberIds);

    const myTaskPts = await prisma.pointLedger.aggregate({
      where: { userId, reason: PointReason.TASK }, _sum: { amount: true },
    });
    const myTaskPoints = myTaskPts._sum.amount ?? 0;

    const taskAheadInOrg = await prisma.pointLedger.groupBy({
      by:     ['userId'],
      where:  { userId: { in: memberIds }, reason: PointReason.TASK },
      _sum:   { amount: true },
      having: { amount: { _sum: { gt: myTaskPoints } } },
    });
    const orgTaskRank  = myTaskPoints > 0 ? taskAheadInOrg.length + 1 : null;
    const orgTaskTotal = await countDistinctUsers(PointReason.TASK, memberIds);

    return {
      org: { id: membership.orgId, name: membership.org.name },
      orgRank: {
        donation: {
          rank: orgDonRank, points: myDonPoints,
          badge: orgDonRank ? getBadge(orgDonRank) : 'Newcomer',
          totalOrgMembers: orgDonTotal,
        },
        task: {
          rank: orgTaskRank, points: myTaskPoints,
          badge: orgTaskRank ? getBadge(orgTaskRank) : 'Newcomer',
          totalOrgMembers: orgTaskTotal,
        },
      },
    };
  }
}

export const leaderboardService = new LeaderboardService();