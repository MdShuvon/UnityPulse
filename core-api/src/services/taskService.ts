import { prisma }               from '../lib/prisma';
import { redis, taskEmitter }  from '../lib/redis';
import { pointService }        from './pointService';
import { notificationService } from './notificationService';
import { auditService }        from './auditService';
import { fileService }         from './fileService';

// Bangladesh timezone helper (UTC+6)
function toBDDate(date: Date): Date {
  const bd = new Date(date.getTime() + 6 * 60 * 60 * 1000);
  bd.setHours(0, 0, 0, 0);
  return bd;
}
function todayBD(): Date { return toBDDate(new Date()); }

export class TaskService {

  // ── CREATE TASK ──────────────────────────────────────────────────────
  // Fix 3: past date block করা হয়েছে
  async createTask(adminId: string, data: {
    title: string; description: string;
    date?: string; deadline?: string | null;
    proofType?: string; pointValue?: number;
    orgId?: string | null;
  }) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });

    if (!['SUPER_ADMIN', 'LOCAL_ADMIN'].includes(admin?.role || '')) {
      throw new Error('Admin access দরকার');
    }

    let finalOrgId: string | null = data.orgId || null;

    // LOCAL_ADMIN কে জোর করে নিজের org-এ assign করো
    if (admin?.role === 'LOCAL_ADMIN') {
      const adminOrg = await prisma.organization.findFirst({ where: { adminId } });
      if (!adminOrg) throw new Error('Organization পাওয়া যায়নি');
      finalOrgId = adminOrg.id;
    }

    // Fix: date field-এ deadline রাখা হচ্ছে, না থাকলে future date (কখনো expire হবে না)
    const taskDate = data.deadline ? new Date(data.deadline) : new Date('2099-12-31');
    taskDate.setHours(0, 0, 0, 0);

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        orgId: finalOrgId || undefined,
        createdBy: adminId,
        date: taskDate,
        pointValue: data.pointValue || 10,
        proofType: data.proofType || 'PHOTO',
      },
    });

    // Org-specific হলে members-কে notify করো
    if (finalOrgId) {
      const members = await prisma.orgMembership.findMany({
        where: { orgId: finalOrgId, status: 'APPROVED' },
        select: { userId: true },
      });
      const memberIds = members.map(m => m.userId);
      if (memberIds.length > 0) {
        await notificationService.sendBulk(
          memberIds,
          'TASK_ASSIGNED',
          `নতুন task: ${task.title}`,
          task.id
        );
      }
    }

    return task;
  }

  // ── MEMBER FEED ──────────────────────────────────────────────────────
  async getMemberFeed(userId: string) {
    const membership = await prisma.orgMembership.findFirst({
      where: { userId, status: 'APPROVED' },
      select: { orgId: true },
    });

    const where: any = {
      status: 'OPEN',
      OR: [
        { orgId: null },
      ],
    };

    if (membership) {
      where.OR.push({ orgId: membership.orgId as string });
    }

    return prisma.task.findMany({
      where,
      include: {
        _count: { select: { submissions: true } },
        org: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  // ── SUBMIT PROOF ─────────────────────────────────────────────────────
  // Fix 2: REJECTED হলে resubmit করা যাবে
  // Fix 4: Task date পার হলে submit block
  // Fix 5: Buffer accept করে (stream issue নেই)
  async submitProof(
    userId: string,
    taskId: string,
    bufferedFiles: Array<{ buffer: Buffer; mimetype: string; filename: string }>
  ) {
    if (bufferedFiles.length === 0)
      throw new Error('কমপক্ষে ১টা proof photo দিতে হবে');
    if (bufferedFiles.length > 5)
      throw new Error('সর্বোচ্চ ৫টা photo দেওয়া যাবে');

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Task পাওয়া যায়নি');
    if (task.status === 'CLOSED') throw new Error('Task বন্ধ হয়ে গেছে');

    // Fix 4: Task এর deadline পার হলে block (deadline null মানে '2099-12-31')
    const taskDeadline = new Date(task.date);
    taskDeadline.setHours(23, 59, 59, 999); // শেষ মুহূর্ত পর্যন্ত
    if (new Date() > taskDeadline) {
      throw new Error('Task submission এর সময় পার হয়ে গেছে');
    }

    // Org membership check — Global task (orgId null) হলে skip
    if (task.orgId) {
      const membership = await prisma.orgMembership.findFirst({
        where: { userId, orgId: task.orgId as string, status: 'APPROVED' },
      });
      if (!membership) throw new Error('এই task তোমার org এর না');
    }

    // Fix 2: শুধু PENDING বা APPROVED থাকলে block করো
    const activeSubmission = await prisma.taskSubmission.findFirst({
      where: { taskId, userId, status: { in: ['PENDING', 'APPROVED'] } },
    });
    if (activeSubmission) {
      if (activeSubmission.status === 'APPROVED')
        throw new Error('এই task ইতিমধ্যে approved হয়েছে');
      throw new Error('এই task এর submission review pending আছে');
    }

    // Fix 5: Buffer থেকে upload
    const photoPaths: string[] = [];
    for (const f of bufferedFiles) {
      const path = await fileService.uploadBuffer(f.buffer, f.mimetype, f.filename, 'proof');
      photoPaths.push(fileService.getUrl(path));
    }

    // Fix 1: @@unique([taskId, userId]) schema এ আছে তাই race condition DB এ block হবে
    const submission = await prisma.taskSubmission.create({
      data: { taskId, userId, proofPhotos: photoPaths, status: 'PENDING' },
    });

    // Notify task creator/admin
    if (task.orgId) {
      const taskOrg = await prisma.organization.findUnique({ where: { id: task.orgId as string } });
      if (taskOrg) {
        await notificationService.send(
          taskOrg.adminId, 'TASK_SUBMITTED',
          `নতুন submission: ${task.title}`, submission.id
        );
      }
    } else {
      // Global task — notify task creator
      await notificationService.send(
        task.createdBy, 'TASK_SUBMITTED',
        `নতুন submission: ${task.title}`, submission.id
      );
    }

    return { message: 'Submit হয়েছে, admin review করবে', id: submission.id };
  }

  // ── CAN APPROVE ──────────────────────────────────────────────────────
  private async canApprove(
    adminId: string, submissionId: string
  ): Promise<{ allowed: boolean; reason?: string }> {

    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });
    // Fix 6: Super admin সব দেখতে ও approve করতে পারে
    if (admin?.role === 'SUPER_ADMIN') return { allowed: true };

    const submission = await prisma.taskSubmission.findUnique({
      where: { id: submissionId }, include: { task: true },
    });
    if (!submission) return { allowed: false, reason: 'Submission পাওয়া যায়নি' };

    const adminOrg = await prisma.organization.findFirst({ where: { adminId } });
    if (!adminOrg) return { allowed: false, reason: 'Admin org পাওয়া যায়নি' };

    if (!submission.task.orgId || submission.task.orgId !== adminOrg.id) {
      return { allowed: false, reason: 'শুধু নিজের org এর task approve করা যাবে' };
    }

    return { allowed: true };
  }

  // ── REVIEW SUBMISSION ────────────────────────────────────────────────
  async reviewSubmission(
    adminId: string, submissionId: string,
    action: 'APPROVED' | 'REJECTED', note?: string
  ) {
    const { allowed, reason } = await this.canApprove(adminId, submissionId);
    if (!allowed) throw new Error(reason);

    const submission = await prisma.taskSubmission.findUnique({
      where: { id: submissionId }, include: { task: true },
    });
    if (!submission) throw new Error('Submission পাওয়া যায়নি');
    if (submission.status !== 'PENDING')
      throw new Error('এই submission already review হয়েছে');

    await prisma.taskSubmission.update({
      where: { id: submissionId },
      data: {
        status: action,
        reviewedBy: adminId,
        reviewNote: note,
        reviewedAt: new Date(),
        pointsAwarded: action === 'APPROVED' ? submission.task.pointValue : null,
      },
    });

    if (action === 'APPROVED') {
      await pointService.add(
        submission.userId, submission.task.pointValue, 'TASK', submissionId
      );
      await notificationService.send(
        submission.userId, 'TASK_APPROVED',
        `${submission.task.pointValue} points পেয়েছেন — ${submission.task.title}`,
        submissionId
      );
    } else {
      await notificationService.send(
        submission.userId, 'TASK_REJECTED',
        `Rejected — ${submission.task.title}. ${note || 'আবার try করো'}`,
        submissionId
      );
    }

    await auditService.log(
      action === 'APPROVED' ? 'TASK_APPROVED' : 'TASK_REJECTED',
      'TaskSubmission', submissionId, adminId,
      { note, taskId: submission.taskId, userId: submission.userId }
    );

    return { message: `Submission ${action}` };
  }

  // ── PENDING SUBMISSIONS ──────────────────────────────────────────────
  // Fix 6: Super admin সব org এর submissions দেখবে
  async getPendingSubmissions(adminId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });

    const where =
      admin?.role === 'SUPER_ADMIN'
        ? { status: 'PENDING' }
        : await (async () => {
            const org = await prisma.organization.findFirst({ where: { adminId } });
            if (!org) throw new Error('Organization পাওয়া যায়নি');
            return { status: 'PENDING', task: { orgId: org.id } };
          })();

    return prisma.taskSubmission.findMany({
      where,
      include: {
        task: {
          select: {
            id: true, title: true, pointValue: true, date: true,
            org: { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, name: true, profilePhoto: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  // ── MY SUBMISSIONS ───────────────────────────────────────────────────
  async getMySubmissions(userId: string) {
    return prisma.taskSubmission.findMany({
      where: { userId },
      include: {
        task: {
          select: {
            id: true, title: true, pointValue: true, date: true,
            org: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // ── ADMIN TASK LIST ──────────────────────────────────────────────────
  async getAdminTasks(adminId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });
    const where =
      admin?.role === 'SUPER_ADMIN'
        ? {}
        : await (async () => {
            const org = await prisma.organization.findFirst({ where: { adminId } });
            if (!org) throw new Error('Organization পাওয়া যায়নি');
            return { orgId: org.id };
          })();

    return prisma.task.findMany({
      where,
      include: { _count: { select: { submissions: true } } },
      orderBy: { date: 'desc' },
    });
  }

    // ── PUBLIC TASKS (Guest + Member) ──────────────
  async getPublicTasks(userId: string | null) {
    const where: any = {
      status: 'OPEN',
      OR: [{ orgId: null }],
    };

    if (userId) {
      const membership = await prisma.orgMembership.findFirst({
        where: { userId, status: 'APPROVED' },
        select: { orgId: true },
      });
      if (membership) {
        where.OR.push({ orgId: membership.orgId as string });
      }
    }

    return prisma.task.findMany({
      where,
      include: {
        org: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

    // ── GET TASK DETAIL ────────────────────────────────────────────────
  async getTaskDetail(taskId: string, userId: string | null) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        org: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
    });

    if (!task) return null;

    // Visibility check
    if (task.orgId) {
      if (!userId) return null; // Guest can't see org task
      const membership = await prisma.orgMembership.findFirst({
        where: { userId, orgId: task.orgId, status: 'APPROVED' },
      });
      if (!membership) return null; // Not org member
    }

    // If user logged in, check their submission status
    let mySubmission = null;
    if (userId) {
      mySubmission = await prisma.taskSubmission.findUnique({
        where: {
          taskId_userId: { taskId, userId },
        },
      });
    }

    return { ...task, mySubmission };
  }

  async updateTaskStatus(adminId: string, taskId: string, status: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Task পাওয়া যায়নি');

    // SUPER_ADMIN can update any task, LOCAL_ADMIN only own
    if (admin?.role !== 'SUPER_ADMIN' && task.createdBy !== adminId) {
      throw new Error('Permission নেই');
    }

    return prisma.task.update({
      where: { id: taskId },
      data: { status },
    });
  }
}

export const taskService = new TaskService();