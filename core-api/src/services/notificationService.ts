//core-api/src/services/notificationService.ts

import { prisma } from '../lib/prisma';
import { redis }  from '../lib/redis';

export class NotificationService {

  // Single send — SSE-তে full notification + unread count publish
  async send(
    userId: string,
    type: string,
    message: string,
    refId?: string,
    refTitle?: string,
  ) {
    const notification = await prisma.notification.create({
      data: { userId, type, message, refId, refTitle },
    });

    // Per-user channel publish — full notification + count
    const count = await this.getUnreadCount(userId);
    await redis.publish(`notify:${userId}`, JSON.stringify({
      unreadCount: count,
      notification: {
        id:        notification.id,
        type:      notification.type,
        message:   notification.message,
        refId:     notification.refId,
        refTitle:  notification.refTitle,
        isRead:    notification.isRead,
        createdAt: notification.createdAt,
      },
    })).catch(() => {});

    return notification;
  }

  // Bulk send — createMany() = 1 DB query, then per-user publish
  async sendBulk(
    userIds: string[],
    type: string,
    message: string,
    refId?: string,
    refTitle?: string,
  ) {
    if (userIds.length === 0) return;

    await prisma.notification.createMany({
      data: userIds.map(userId => ({ userId, type, message, refId, refTitle })),
    });
    // Fetch created notifications for full payload
    const created = await prisma.notification.findMany({
      where: {
        userId: { in: userIds },
        type,
        message,
        refId: refId || null,
      },
      orderBy: { createdAt: 'desc' },
      take:    userIds.length,
    });

    // Per-user publish with actual notification object
    for (const userId of userIds) {
      const userNotif = created.find(n => n.userId === userId);
      if (!userNotif) continue;

      const count = await this.getUnreadCount(userId);
      redis.publish(`notify:${userId}`, JSON.stringify({
        unreadCount:  count,
        notification: {
          id:        userNotif.id,
          type:      userNotif.type,
          message:   userNotif.message,
          refId:     userNotif.refId,
          isRead:    userNotif.isRead,
          createdAt: userNotif.createdAt,
        },
      })).catch(() => {});
    }
  }

  // Paginated with filter support (all | unread)
  async getNotifications(
    userId: string,
    limit = 20,
    page = 1,
    filter: 'all' | 'unread' = 'all',
  ) {
    const offset = (page - 1) * limit;

    const where: any = { userId };
    if (filter === 'unread') {
      where.isRead = false;
    }

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    offset,
        take:    limit,
        select: {
          id:        true,
          type:      true,
          message:   true,
          refId:     true,
          refTitle:  true,  // ← ADD
          isRead:    true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data:       items,
      pagination: { page, limit, total, hasMore: offset + items.length < total },
    };
  }

  // Count only — for bell badge
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }

  // Single mark read — ownership check + SSE publish
  async markRead(userId: string, notificationId: string) {
    const notif = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notif) throw new Error('Notification পাওয়া যায়নি');

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data:  { isRead: true },
    });

    // ✅ SSE publish — badge update instantly
    const count = await this.getUnreadCount(userId);
    await redis.publish(`notify:${userId}`, JSON.stringify({ unreadCount: count }))
      .catch(() => {});

    return updated;
  }

  // Batch mark all read + SSE publish
  async markAllRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true },
    });

    // ✅ SSE publish — badge 0 এ reset
    await redis.publish(`notify:${userId}`, JSON.stringify({ unreadCount: 0 }))
      .catch(() => {});

    return { message: 'সব notification read হিসেবে mark হয়েছে' };
  }
}

export const notificationService = new NotificationService();