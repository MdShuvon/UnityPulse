import { prisma }               from '../lib/prisma';
import { redis }               from '../lib/redis';
import { fileService }         from './fileService';
import { notificationService } from './notificationService';
import { auditService }        from './auditService';
import sanitizeHtml            from 'sanitize-html';
import escapeHtml              from 'escape-html';

// Fix 5: SET-based press cache tracking
const PRESS_CACHE_SET = 'press:cache-keys';
const PRESS_CACHE_TTL = 60; // 1 minute

async function pressCacheSet(key: string, data: any) {
  await redis.set(key, JSON.stringify(data), 'EX', PRESS_CACHE_TTL);
  await redis.sadd(PRESS_CACHE_SET, key);
}

async function invalidatePressCache() {
  const keys = await redis.smembers(PRESS_CACHE_SET);
  if (keys.length > 0) {
    await redis.del(...keys);
    await redis.del(PRESS_CACHE_SET);
  }
}

// Fix 4: Markdown-safe content
// HTML tags strip করো, কিন্তু markdown syntax থাকবে
// Server plain text markdown store করে — frontend render করবে
function sanitizeContent(content: string): string {
  // 1. HTML tags strip (XSS prevent)
  const noHtml = sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} });
  // 2. Dangerous HTML chars escape
  return escapeHtml(noHtml);
}

export class PostService {

  // ── CREATE POST ──────────────────────────────────────────────────────
  // Fix 6: Buffered files (stream issue নেই)
  async createPost(userId: string, data: {
    content?:   string;
    visibility: 'PUBLIC' | 'ORG_ONLY' | 'MEMBERS_ONLY';
  }, bufferedFiles: Array<{ buffer: Buffer; mimetype: string; filename: string }>) {
    if (!data.content?.trim() && bufferedFiles.length === 0) {
      throw new Error('Content অথবা কমপক্ষে ১টা photo দিতে হবে');
    }
    if (bufferedFiles.length > 5) throw new Error('সর্বোচ্চ ৫টা photo');

    // Fix 4: Markdown-safe sanitize
    const safeContent = data.content ? sanitizeContent(data.content) : null;

    const photoPaths: string[] = [];
    for (const f of bufferedFiles) {
      const path = await fileService.uploadBuffer(f.buffer, f.mimetype, f.filename, 'post');
      photoPaths.push(fileService.getUrl(path));
    }

    const post = await prisma.post.create({
      data: { userId, content: safeContent, photos: photoPaths, visibility: data.visibility },
      include: { user: { select: { id: true, name: true, profilePhoto: true } } },
    });

    if (data.visibility === 'PUBLIC') await invalidatePressCache();
    return post;
  }

  // ── PRESS FEED ────────────────────────────────────────────────────────
  // Fix 5: SET-based cache
  async getPressFeed(limit = 20, page = 1) {
    const cacheKey = `press:${limit}:${page}`;
    const cached   = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const offset = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where:   { visibility: 'PUBLIC', isHidden: false, isDeleted: false },
        include: {
          user:   { select: { id: true, name: true, profilePhoto: true } },
          _count: { select: { likes: true, comments: true } }, // Fix 10: denormalized count বাদ
        },
        orderBy: { createdAt: 'desc' },
        skip: offset, take: limit,
      }),
      prisma.post.count({ where: { visibility: 'PUBLIC', isHidden: false, isDeleted: false } }),
    ]);

    const result = { data: posts, pagination: { page, limit, total, hasMore: offset + posts.length < total } };
    await pressCacheSet(cacheKey, result);
    return result;
  }

  // ── ORG FEED ──────────────────────────────────────────────────────────
  async getOrgFeed(userId: string, limit = 20, page = 1) {
  const membership = await prisma.orgMembership.findFirst({
    where: { userId, status: 'APPROVED' }, select: { orgId: true },
  });
  if (!membership) throw new Error('কোনো org এর approved member নও');

  const memberIds = (await prisma.orgMembership.findMany({
    where: { orgId: membership.orgId, status: 'APPROVED' }, select: { userId: true },
  })).map(m => m.userId);

  const offset = (page - 1) * limit;
  const where: any = { 
    userId: { in: memberIds }, 
    visibility: { in: ['PUBLIC', 'ORG_ONLY'] },
    isHidden: false, 
    isDeleted: false 
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where, include: {
        user: { select: { id: true, name: true, profilePhoto: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' }, skip: offset, take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return { data: posts, pagination: { page, limit, total, hasMore: offset + posts.length < total } };
}

  // ── USER'S POSTS (for profile) ────────────────────────────────────────
  // Fix 9: নতুন endpoint
  async getUserPosts(targetUserId: string, viewerId: string | null, limit = 20, page = 1) {
  const offset = (page - 1) * limit;
  
  const visibilityFilter: any = viewerId === targetUserId
    ? { in: ['PUBLIC', 'ORG_ONLY', 'MEMBERS_ONLY'] }
    : 'PUBLIC';

  const where: any = {
    userId: targetUserId,
    visibility: visibilityFilter,
    isDeleted: false,
    isHidden: false,
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where, include: {
        user: { select: { id: true, name: true, profilePhoto: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' }, skip: offset, take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return { data: posts, pagination: { page, limit, total, hasMore: offset + posts.length < total } };
}

  // ── SINGLE POST ───────────────────────────────────────────────────────
  async getSinglePost(postId: string) {
    const post = await prisma.post.findFirst({
      where:   { id: postId, isDeleted: false },
      include: {
        user:   { select: { id: true, name: true, profilePhoto: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!post) throw new Error('Post পাওয়া যায়নি');
    return post;
  }

  // ── EDIT POST ─────────────────────────────────────────────────────────
  async editPost(userId: string, postId: string, data: { content?: string; visibility?: string }) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.isDeleted) throw new Error('Post পাওয়া যায়নি');
    if (post.userId !== userId) throw new Error('Permission নেই');

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        content:    data.content ? sanitizeContent(data.content) : undefined,
        visibility: data.visibility as any,
        editedAt:   new Date(),
      },
    });
    await invalidatePressCache();
    return updated;
  }

  // ── SOFT DELETE POST ──────────────────────────────────────────────────
  async deletePost(userId: string, postId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.isDeleted) throw new Error('Post পাওয়া যায়নি');
    if (post.userId !== userId) throw new Error('Permission নেই');
    await prisma.post.update({ where: { id: postId }, data: { isDeleted: true } });
    await invalidatePressCache();
    return { message: 'Post delete হয়েছে' };
  }

  // ── TOGGLE POST LIKE ──────────────────────────────────────────────────
  async togglePostLike(userId: string, postId: string) {
    const post = await prisma.post.findFirst({ where: { id: postId, isDeleted: false, isHidden: false } });
    if (!post) throw new Error('Post পাওয়া যায়নি');

    try {
      await prisma.like.delete({ where: { userId_postId: { userId, postId } } });
      return { liked: false };
    } catch {
      await prisma.like.create({ data: { userId, postId } });
      if (post.userId !== userId) {
        const liker = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        await notificationService.send(post.userId, 'GENERAL', `${liker?.name} আপনার post like করেছে`, postId);
      }
      return { liked: true };
    }
  }

  // ── CREATE COMMENT ────────────────────────────────────────────────────
  async createComment(userId: string, postId: string, content: string, parentId?: string) {
    const post = await prisma.post.findFirst({ where: { id: postId, isDeleted: false, isHidden: false } });
    if (!post) throw new Error('এই post এ comment করা যাবে না');

    const safeContent = sanitizeContent(content);
    if (!safeContent.trim()) throw new Error('Comment empty হতে পারবে না');

    // Fix 7: Transaction — depth race condition নেই
    const comment = await prisma.$transaction(async (tx) => {
      let depth = 0;
      if (parentId) {
        const parent = await tx.comment.findUnique({ where: { id: parentId } });
        if (!parent || parent.isDeleted) throw new Error('Parent comment পাওয়া যায়নি');
        if (parent.depth >= 2) throw new Error('সর্বোচ্চ ৩ level comment করা যাবে');
        depth = parent.depth + 1;
      }
      return tx.comment.create({
        data: { userId, postId, content: safeContent, parentId: parentId || null, depth },
        include: { user: { select: { id: true, name: true, profilePhoto: true } } },
      });
    });

    // Notifications (transaction বাইরে)
    const commenter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    if (post.userId !== userId) {
      await notificationService.send(post.userId, 'GENERAL', `${commenter?.name} comment করেছে`, postId);
    }
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (parent && parent.userId !== userId) {
        await notificationService.send(parent.userId, 'GENERAL', `${commenter?.name} reply করেছে`, postId);
      }
    }
    return comment;
  }

  // ── GET COMMENTS (paginated top-level + all replies) ─────────────────
  // Fix 8: Top-level paginated — popular post crash করবে না
  async getComments(postId: string, limit = 20, page = 1) {
    const offset = (page - 1) * limit;

    const [topLevel, total] = await Promise.all([
      prisma.comment.findMany({
        where:   { postId, parentId: null, isDeleted: false },
        include: {
          user:    { select: { id: true, name: true, profilePhoto: true } },
          replies: {
            where:   { isDeleted: false },
            include: {
              user:    { select: { id: true, name: true, profilePhoto: true } },
              replies: {
                where:   { isDeleted: false },
                include: { user: { select: { id: true, name: true, profilePhoto: true } } },
                orderBy: { createdAt: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          _count: { select: { likes: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip: offset, take: limit,
      }),
      prisma.comment.count({ where: { postId, parentId: null, isDeleted: false } }),
    ]);

    return { data: topLevel, pagination: { page, limit, total, hasMore: offset + topLevel.length < total } };
  }

  // ── EDIT COMMENT (member own) ─────────────────────────────────────────
  // Fix 1: নতুন method
  async editComment(userId: string, commentId: string, content: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.isDeleted) throw new Error('Comment পাওয়া যায়নি');
    if (comment.userId !== userId) throw new Error('Permission নেই');

    const safeContent = sanitizeContent(content);
    if (!safeContent.trim()) throw new Error('Comment empty হতে পারবে না');

    return prisma.comment.update({
      where: { id: commentId },
      data:  { content: safeContent, editedAt: new Date() },
      include: { user: { select: { id: true, name: true, profilePhoto: true } } },
    });
  }

  // ── SOFT DELETE COMMENT (member own) ─────────────────────────────────
  // Fix 2: নতুন method — content '[deleted]' হয়, replies থাকে
  async deleteComment(userId: string, commentId: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.isDeleted) throw new Error('Comment পাওয়া যায়নি');
    if (comment.userId !== userId) throw new Error('Permission নেই');

    await prisma.comment.update({
      where: { id: commentId },
      data:  { isDeleted: true, content: '[deleted]' }, // replies এর context রাখতে
    });
    return { message: 'Comment delete হয়েছে' };
  }

  // ── TOGGLE COMMENT LIKE ───────────────────────────────────────────────
  // Fix 3: নতুন method
  async toggleCommentLike(userId: string, commentId: string) {
    const comment = await prisma.comment.findFirst({ where: { id: commentId, isDeleted: false } });
    if (!comment) throw new Error('Comment পাওয়া যায়নি');

    try {
      await prisma.like.delete({ where: { userId_commentId: { userId, commentId } } });
      return { liked: false };
    } catch {
      await prisma.like.create({ data: { userId, commentId } });
      return { liked: true };
    }
  }

  // ── REPORT ───────────────────────────────────────────────────────────
  async reportContent(userId: string, targetId: string, targetType: 'POST' | 'COMMENT', reason: string) {
        const existing = await prisma.report.findFirst({ where: { reporterId: userId, targetId } });
        if (existing) throw new Error('আপনি এটা ইতিমধ্যে report করেছেন');
        await prisma.report.create({ data: { reporterId: userId, targetId, targetType, reason, status: 'PENDING' } });
    return { message: 'Report করা হয়েছে। Admin review করবে।' };
}

  // ── SEARCH ───────────────────────────────────────────────────────────
  async searchUsers(query: string) {
    if (query.trim().length < 3) throw new Error('কমপক্ষে ৩ অক্ষর দিয়ে search করো');
    return prisma.user.findMany({
      where:  { name: { contains: query.trim(), mode: 'insensitive' }, isVerified: true },
      select: { id: true, name: true, profilePhoto: true, role: true, area: { select: { name: true } } },
      take:   20,
    });
  }

  // ── ADMIN: MODERATION QUEUE ───────────────────────────────────────────
  async getModerationQueue() {
  return prisma.report.findMany({
    where:   { status: 'PENDING' },
    include: { reporter: { select: { id: true, name: true } } }, // 'user' → 'reporter'
    orderBy: { createdAt: 'asc' },
  });
}

  // ── ADMIN: HANDLE REPORT ──────────────────────────────────────────────
  async handleReport(adminId: string, reportId: string, action: 'HIDE' | 'REMOVE' | 'DISMISS', note?: string) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error('Report পাওয়া যায়নি');
    if (report.status !== 'PENDING') throw new Error('Already reviewed');

    await prisma.report.update({
      where: { id: reportId },
      data:  { status: action === 'DISMISS' ? 'DISMISSED' : 'REVIEWED', reviewNote: note, reviewedBy: adminId },
    });

    if (action !== 'DISMISS') {
      if (report.targetType === 'POST') {
        await prisma.post.update({
          where: { id: report.targetId },
          data:  action === 'HIDE' ? { isHidden: true } : { isDeleted: true },
        });
        await invalidatePressCache();
      } else if (report.targetType === 'COMMENT') {
        await prisma.comment.update({
          where: { id: report.targetId },
          data:  { isDeleted: true, content: '[removed by admin]' },
        });
      }
    }

    await auditService.log(
      action === 'DISMISS' ? 'REPORT_DISMISSED' : 'POST_MODERATED',
      'Report', reportId, adminId, { action, note }
    );
    return { message: `Report ${action}` };
  }

  // ── ADMIN: RESTORE POST ───────────────────────────────────────────────
  async restorePost(adminId: string, postId: string) {
    await prisma.post.update({ where: { id: postId }, data: { isHidden: false } });
    await invalidatePressCache();
    await auditService.log('POST_RESTORED', 'Post', postId, adminId, {});
    return { message: 'Post restore হয়েছে' };
  }
}

export const postService = new PostService();