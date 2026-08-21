import { prisma }               from '../lib/prisma';
import { fileService }         from './fileService';
import { notificationService } from './notificationService';
import { auditService }        from './auditService';
import { dashboardService }    from './dashboardService';

export class LocalAdminService {

  async submitApplication(
    userId:    string,
    data:      { orgName: string; areaId: string; memberCount: number; isEmergency: boolean },
    bankProof: { buffer: Buffer; mimetype: string; filename: string },
    emergencyProof?: { buffer: Buffer; mimetype: string; filename: string }
  ) {
    if (data.isEmergency && !emergencyProof) {
      throw new Error('Emergency application এ proof document দিতে হবে');
    }
    if (data.memberCount < 10) {
      throw new Error('কমপক্ষে ১০ জন member এর proof দিতে হবে');
    }

    // Fix 4: PENDING check (no @unique constraint)
    const pending = await prisma.localAdminApplication.findFirst({
      where: { userId, status: 'PENDING' },
    });
    if (pending) throw new Error('একটা application ইতিমধ্যে pending আছে');

    // Area exist check
    const area = await prisma.area.findUnique({ where: { id: data.areaId } });
    if (!area) throw new Error('Area পাওয়া যায়নি');

    // Bug 7 fix: Buffer already received from route — no stream issue
    const bankPath = await fileService.uploadBuffer(
      bankProof.buffer, bankProof.mimetype, bankProof.filename, 'documents'
    );
    const bankUrl  = fileService.getUrl(bankPath);

    let emergencyUrl: string | undefined;
    if (data.isEmergency && emergencyProof) {
      const ep     = await fileService.uploadBuffer(emergencyProof.buffer, emergencyProof.mimetype, emergencyProof.filename, 'documents');
      emergencyUrl = fileService.getUrl(ep);
    }

    const application = await prisma.localAdminApplication.create({
      data: {
        userId, orgName: data.orgName, areaId: data.areaId,
        memberCount: data.memberCount, bankProofUrl: bankUrl,
        isEmergency: data.isEmergency, emergencyProof: emergencyUrl,
        status: 'PENDING',
      },
    });

    await auditService.log(
      'LOCAL_ADMIN_APPLICATION_SUBMITTED', 'LocalAdminApplication',
      application.id, userId, { orgName: data.orgName }
    );

    return { message: 'Application submit হয়েছে। Super admin review করবে।', id: application.id };
  }

  async getMyApplication(userId: string) {
    return prisma.localAdminApplication.findFirst({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingApplications() {
    return prisma.localAdminApplication.findMany({
      where:   { status: 'PENDING' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        area: { select: { id: true, name: true, district: true } },
      },
      orderBy: [{ isEmergency: 'desc' }, { createdAt: 'asc' }],
    });
  }

  // Bug 3 fix: Transaction এ area check — race condition proof
  async approveApplication(superAdminId: string, applicationId: string) {
    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.localAdminApplication.findUnique({
        where: { id: applicationId },
        include: { user: true, area: true },
      });
      if (!application)                    throw new Error('Application পাওয়া যায়নি');
      if (application.status !== 'PENDING') throw new Error('Already reviewed');

      // Race condition fix — area এ already active org আছে?
      const existingOrg = await tx.organization.findFirst({
        where: { areaId: application.areaId, isActive: true },
      });
      if (existingOrg) throw new Error(`${application.area.name} এলাকায় ইতিমধ্যে organization আছে`);

      await tx.localAdminApplication.update({
        where: { id: applicationId },
        data:  { status: 'APPROVED', reviewedBy: superAdminId, reviewedAt: new Date() },
      });

      await tx.user.update({ where: { id: application.userId }, data: { role: 'LOCAL_ADMIN' } });

      const org = await tx.organization.create({
        data: {
          name: application.orgName, areaId: application.areaId,
          adminId: application.userId, isActive: true,
        },
      });

      return { application, org };
    });

    await notificationService.send(
      result.application.userId, 'LOCAL_ADMIN_APPROVED',
      `আপনার organization "${result.application.orgName}" approve হয়েছে!`,
      result.org.id
    );
    await dashboardService.invalidateStats();
    await auditService.log('LOCAL_ADMIN_APPROVED', 'LocalAdminApplication', applicationId, superAdminId, { orgId: result.org.id });

    return { message: 'Approved। Organization তৈরি হয়েছে।' };
  }

  async rejectApplication(superAdminId: string, applicationId: string, reason: string) {
    const application = await prisma.localAdminApplication.findUnique({ where: { id: applicationId } });
    if (!application)                    throw new Error('Application পাওয়া যায়নি');
    if (application.status !== 'PENDING') throw new Error('Already reviewed');

    await prisma.localAdminApplication.update({
      where: { id: applicationId },
      data:  { status: 'REJECTED', reviewNote: reason, reviewedBy: superAdminId, reviewedAt: new Date() },
    });

    await notificationService.send(
      application.userId, 'LOCAL_ADMIN_REJECTED',
      `Application reject হয়েছে। কারণ: ${reason}। আবার apply করতে পারবেন।`,
      applicationId
    );
    await auditService.log('LOCAL_ADMIN_REJECTED', 'LocalAdminApplication', applicationId, superAdminId, { reason });
    return { message: 'Application reject করা হয়েছে।' };
  }

  async revokeLocalAdmin(superAdminId: string, userId: string, reason: string) {
    const org = await prisma.organization.findFirst({
      where:   { adminId: userId, isActive: true },
      include: { memberships: { where: { status: 'APPROVED' }, select: { userId: true } } },
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { role: 'MEMBER' } });
      if (org) await tx.organization.update({ where: { id: org.id }, data: { isActive: false } });
    });

    if (org && org.memberships.length > 0) {
      await notificationService.sendBulk(
        org.memberships.map(m => m.userId),
        'GENERAL', 'আপনার organization deactivate হয়েছে। নতুন org join করুন।', org.id
      );
    }

    await dashboardService.invalidateStats();
    await auditService.log('LOCAL_ADMIN_REVOKED', 'User', userId, superAdminId, { reason, orgId: org?.id });
    return { message: 'Local admin revoke হয়েছে।' };
  }

  // Bug 3 fix: Organization table থেকে query করো — User এ organization relation নেই
  async getLocalAdmins() {
    const orgs = await prisma.organization.findMany({
      where:   { isActive: true },
      include: {
        area: { select: { id: true, name: true, district: true } },
        _count: { select: { memberships: { where: { status: 'APPROVED' } } } },
      },
    });

    // Admin user info আলাদা query
    const adminIds = orgs.map(o => o.adminId);
    const admins   = await prisma.user.findMany({
      where:  { id: { in: adminIds } },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });
    const adminMap = Object.fromEntries(admins.map(a => [a.id, a]));

    return orgs.map(org => ({
      org:   { id: org.id, name: org.name, area: org.area, memberCount: org._count.memberships },
      admin: adminMap[org.adminId] || null,
    }));
  }

  async getAuditLog(filters: {
    adminId?: string; action?: string; from?: string; to?: string;
    limit?: number; page?: number;
  }) {
    const { adminId, action, from, to, limit = 20, page = 1 } = filters;
    const offset = (page - 1) * limit;
    const where: any = {};
    if (adminId) where.userId = adminId;
    if (action)  where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    offset,
        take:    limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { data: logs, pagination: { page, limit, total, hasMore: offset + logs.length < total } };
  }
}

export const localAdminService = new LocalAdminService();