import { prisma } from '../lib/prisma';

export type AuditAction =
  | 'DONATION_CREATED'
  | 'TASK_APPROVED'
  | 'TASK_REJECTED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_REFUNDED'
  | 'ADMIN_ACTION'
  | 'POST_MODERATED'    // hide বা remove
  | 'POST_RESTORED'     // admin restore
  | 'REPORT_DISMISSED'  // admin dismiss
  | 'COMMENT_DELETED'  // admin comment delete;
  | 'LOCAL_ADMIN_APPLICATION_SUBMITTED'
  | 'LOCAL_ADMIN_APPROVED'
  | 'LOCAL_ADMIN_REJECTED'
  | 'LOCAL_ADMIN_REVOKED';

export class AuditService {

  async log(
    action: AuditAction,
    entityType: string,
    entityId: string,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,  // 👈 এইভাবে
      },
    });
  }

  async getByEntity(entityType: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const auditService = new AuditService();