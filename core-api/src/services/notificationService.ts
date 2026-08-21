import { prisma } from '../lib/prisma';
import { redis }  from '../lib/redis';

export class NotificationService {

  // Single send — Bug 1 fix: redis.publish() for SSE routing
  async send(userId: string, type: string, message: string, refId?: string) {
    const notification = await prisma.notification.create({
      data: { userId, type, message, refId },
    });

    // Per-user channel publish — notificationEmitter এ route হবে
    const count = await this.getUnreadCount(userId);
    await redis.publish(`notify:${userId}`, JSON.stringify({ unreadCount: count }))
      .catch(() => {}); // SSE না থাকলে skip

    return notification;
  }

  // Bulk send — Bug 9 fix: createMany() = 1 DB query instead of N
  async sendBulk(userIds: string[], type: string, message: string, refId?: string) {
    if (userIds.length === 0) return;

    await prisma.notification.createMany({
      data: userIds.map(userId => ({ userId, type, message, refId })),
    });

    // Non-blocking Redis publish per user
    userIds.forEach(userId => {
      redis.publish(`notify:${userId}`, JSON.stringify({ newNotification: true }))
        .catch(() => {});
    });
  }

  // Paginated — not getUnread() with all rows
  async getNotifications(userId: string, limit = 20, page = 1) {
    const offset = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        skip:    offset,
        take:    limit,
      }),
      prisma.notification.count({ where: { userId } }),
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

  // Single mark read — ownership check করো
  async markRead(userId: string, notificationId: string) {
    const notif = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notif) throw new Error('Notification পাওয়া যায়নি');
    return prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
  }

  // Batch mark all read
  async markAllRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true },
    });
    return { message: 'সব notification read হিসেবে mark হয়েছে' };
  }
}

export const notificationService = new NotificationService();