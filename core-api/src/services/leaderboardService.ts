//core-api/src/services/leaderboardService.ts
import { prisma } from '../lib/prisma';
import { redis }  from '../lib/redis';

const CACHE_TTL      = 300; // 5 minutes
const CACHE_KEYS_SET = 'lb:cache-keys';

// Helper: cache set + key track করো
async function cacheSet(key: string, data: any) {
  await redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL);
  await redis.sadd(CACHE_KEYS_SET, key); // Fix 3: SET এ track করো
}

// Badge — DB তে store হয় না, rank থেকে real-time
export function getBadge(rank: number): string {
  if (rank === 1)  return 'Legend';
  if (rank <= 3)   return 'Champion';
  if (rank <= 10)  return 'Elite';
  if (rank <= 50)  return 'Star';
  if (rank <= 100) return 'Active';
  return 'Newcomer';
}

// Fix 1: Batch user fetch — N+1 solve করে
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

// Fix 5: Efficient count — full rows load না করে
async function countDistinctUsers(reason: string, orgMemberIds?: string[]) {
  return prisma.pointLedger.findMany({
    where:    { reason, ...(orgMemberIds ? { userId: { in: orgMemberIds } } : {}) },
    select:   { userId: true },
    distinct: ['userId'],
  }).then(r => r.length);
}

export class LeaderboardService {

  // ── GLOBAL DONATION LEADERBOARD ──────────────────────────────────────
  async getDonationLeaderboard(limit = 20, page = 1) {
    const cacheKey = `lb:donation:${limit}:${page}`;
    const cached   = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const offset = (page - 1) * limit;

    // Fix 5: Efficient count
    const total = await countDistinctUsers('DONATION');

    const raw = await prisma.pointLedger.groupBy({
      by:      ['userId'],
      where:   { reason: 'DONATION' },
      _sum:    { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      skip:    offset,
      take:    limit,
    });

    // Fix 1: Batch fetch
    const data   = await enrichWithUsers(raw as any, offset);
    const result = {
      data,
      pagination: { page, limit, total, hasMore: offset + raw.length < total },
    };

    await cacheSet(cacheKey, result);
    return result;
  }

  // ── GLOBAL TASK LEADERBOARD ───────────────────────────────────────────
  async getTaskLeaderboard(limit = 20, page = 1) {
    const cacheKey = `lb:task:${limit}:${page}`;
    const cached   = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const offset = (page - 1) * limit;
    const total  = await countDistinctUsers('TASK');

    const raw = await prisma.pointLedger.groupBy({
      by:      ['userId'],
      where:   { reason: 'TASK' },
      _sum:    { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      skip:    offset,
      take:    limit,
    });

    // Fix 1: Batch fetch users + task counts
    const userIds    = raw.map(r => r.userId);
    const users      = await prisma.user.findMany({
      where:  { id: { in: userIds } },
      select: { id: true, name: true, profilePhoto: true },
    });
    const userMap    = Object.fromEntries(users.map(u => [u.id, u]));

    // Batch task count
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

  // ── ORG VS ORG LEADERBOARD ────────────────────────────────────────────
  // Fix 6: N+1 solve — সব org এর task points একটা query তে
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

    // Fix 6: সব member এর task points একটা query তে
    const allMemberIds = [...new Set(
      orgs.flatMap(o => o.memberships.map(m => m.userId))
    )];
    const allTaskPoints = allMemberIds.length > 0
      ? await prisma.pointLedger.groupBy({
          by:    ['userId'],
          where: { userId: { in: allMemberIds }, reason: 'TASK' },
          _sum:  { amount: true },
        })
      : [];
    const taskPointMap = Object.fromEntries(
      allTaskPoints.map(t => [t.userId, t._sum.amount ?? 0])
    );

    const scored = orgs.map(org => {
      const totalDonation = org.donationProjects.reduce((s, p) => s + p.collectedAmount, 0);
      const donationScore = totalDonation / 1000;

      const taskPoints    = org.memberships.reduce(
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

  // ── ORG INTERNAL DONATION RANK ───────────────────────────────────────
  // NEW: ওই org এর শুধু members এর donation rank
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
    const total  = await countDistinctUsers('DONATION', memberIds);

    const raw = await prisma.pointLedger.groupBy({
      by:      ['userId'],
      where:   { userId: { in: memberIds }, reason: 'DONATION' },
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

  // ── ORG INTERNAL TASK RANK ────────────────────────────────────────────
  // NEW: ওই org এর শুধু members এর task rank
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
    const total  = await countDistinctUsers('TASK', memberIds);

    const raw = await prisma.pointLedger.groupBy({
      by:      ['userId'],
      where:   { userId: { in: memberIds }, reason: 'TASK' },
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

  // ── MY GLOBAL RANK ────────────────────────────────────────────────────
  // Fix 2: having query — সব user memory তে load করে না
  async getMyRank(userId: string) {
    // Donation rank
    const myDonPts = await prisma.pointLedger.aggregate({
      where: { userId, reason: 'DONATION' }, _sum: { amount: true },
    });
    const myDonPoints = myDonPts._sum.amount ?? 0;

    const donAhead = await prisma.pointLedger.groupBy({
      by:     ['userId'],
      where:  { reason: 'DONATION' },
      _sum:   { amount: true },
      having: { amount: { _sum: { gt: myDonPoints } } },
    });
    const donationRank   = myDonPoints > 0 ? donAhead.length + 1 : null;
    const donationTotal  = await countDistinctUsers('DONATION');

    // Task rank
    const myTaskPts = await prisma.pointLedger.aggregate({
      where: { userId, reason: 'TASK' }, _sum: { amount: true },
    });
    const myTaskPoints = myTaskPts._sum.amount ?? 0;

    const taskAhead = await prisma.pointLedger.groupBy({
      by:     ['userId'],
      where:  { reason: 'TASK' },
      _sum:   { amount: true },
      having: { amount: { _sum: { gt: myTaskPoints } } },
    });
    const taskRank  = myTaskPoints > 0 ? taskAhead.length + 1 : null;
    const taskTotal = await countDistinctUsers('TASK');

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

  // ── MY ORG RANK ───────────────────────────────────────────────────────
  // NEW: নিজের org এ নিজের position
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

    // Donation rank within org
    const myDonPts = await prisma.pointLedger.aggregate({
      where: { userId, reason: 'DONATION' }, _sum: { amount: true },
    });
    const myDonPoints = myDonPts._sum.amount ?? 0;

    const donAheadInOrg = await prisma.pointLedger.groupBy({
      by:     ['userId'],
      where:  { userId: { in: memberIds }, reason: 'DONATION' },
      _sum:   { amount: true },
      having: { amount: { _sum: { gt: myDonPoints } } },
    });
    const orgDonRank  = myDonPoints > 0 ? donAheadInOrg.length + 1 : null;
    const orgDonTotal = await countDistinctUsers('DONATION', memberIds);

    // Task rank within org
    const myTaskPts = await prisma.pointLedger.aggregate({
      where: { userId, reason: 'TASK' }, _sum: { amount: true },
    });
    const myTaskPoints = myTaskPts._sum.amount ?? 0;

    const taskAheadInOrg = await prisma.pointLedger.groupBy({
      by:     ['userId'],
      where:  { userId: { in: memberIds }, reason: 'TASK' },
      _sum:   { amount: true },
      having: { amount: { _sum: { gt: myTaskPoints } } },
    });
    const orgTaskRank  = myTaskPoints > 0 ? taskAheadInOrg.length + 1 : null;
    const orgTaskTotal = await countDistinctUsers('TASK', memberIds);

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