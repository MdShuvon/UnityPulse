import { prisma }           from '../lib/prisma';
import { redis, donationEmitter } from '../lib/redis';
import { pointService }      from './pointService';
import { auditService }      from './auditService';
import { notificationService } from './notificationService';

export class DonationService {

  // ── PROJECT CRUD (Admin only) ─────────────────────────
  async createProject(adminId: string, data: {
    title:       string;
    description: string;
    goalAmount:  number;
    orgId?:      string;
    deadline?:   string;
    coverImage?: string;
  }) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    let finalOrgId: string | null = data.orgId || null;

    if (admin?.role === 'LOCAL_ADMIN') {
      const adminOrg = await prisma.organization.findFirst({
        where: { adminId },
      });
      if (!adminOrg) throw new Error('Organization পাওয়া যায়নি');
      finalOrgId = adminOrg.id;
    }

    if (admin?.role === 'SUPER_ADMIN' && !finalOrgId) {
      throw new Error('SUPER_ADMIN কে orgId দিতে হবে');
    }

    const project = await prisma.donationProject.create({
      data: {
        title:       data.title,
        description: data.description,
        goalAmount:  data.goalAmount,
        orgId:       finalOrgId!,
        createdBy:   adminId,
        deadline:    data.deadline ? new Date(data.deadline) : null,
        coverImage:  data.coverImage,
      },
    });

    await auditService.log(
      'DONATION_CREATED', 'DonationProject',
      project.id, adminId, { goalAmount: data.goalAmount }
    );

    return project;
  }

  async updateProject(adminId: string, projectId: string, data: {
    title?:       string;
    description?: string;
    status?:      string;
    deadline?:    string;
  }) {
    const project = await prisma.donationProject.findFirst({
      where: { id: projectId, createdBy: adminId },
    });
    if (!project) throw new Error('Project পাওয়া যায়নি বা permission নেই');

    return prisma.donationProject.update({
      where: { id: projectId },
      data: {
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
    });
  }

  async addExpense(adminId: string, projectId: string, data: {
    description: string;
    amount:      number;
    proofUrl?:   string;
  }) {
    const project = await prisma.donationProject.findFirst({
      where: { id: projectId, createdBy: adminId },
    });
    if (!project) throw new Error('Permission নেই');

    // ✅ প্রশ্ন ৮ — Expense > collectedAmount fraud detection
    if (data.amount > project.collectedAmount) {
      throw new Error(
        `Expense (৳${data.amount}) collected amount (৳${project.collectedAmount}) এর চেয়ে বেশি হতে পারে না`
      );
    }

    return prisma.projectExpense.create({
      data: { projectId, ...data },
    });
  }

  // ── PUBLIC PROJECT LIST ───────────────────────────────
  async getAllProjects() {
    return prisma.donationProject.findMany({
      where:   { status: 'active' },
      include: {
        org: { select: { id: true, name: true } },
        _count: { select: { donations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminProjects(adminId: string) {
    const requester = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (requester?.role === 'SUPER_ADMIN') {
      return prisma.donationProject.findMany({
        include: {
          _count: { select: { donations: true } },
          org: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const adminOrg = await prisma.organization.findFirst({
      where: { adminId },
    });
    if (!adminOrg) throw new Error('Organization পাওয়া যায়নি');

    return prisma.donationProject.findMany({
      where: { orgId: adminOrg.id },
      include: {
        _count: { select: { donations: true } },
        org: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProjectDetail(projectId: string) {
    const project = await prisma.donationProject.findUnique({
      where:   { id: projectId },
      include: {
        org:      { select: { id: true, name: true } },
        expenses: { orderBy: { createdAt: 'asc' } },
        donations: {
          select: {
            id: true, amount: true, method: true,
            guestName: true, createdAt: true,
            user: { select: { id: true, name: true, profilePhoto: true } },
          },
          orderBy: { createdAt: 'desc' },
          take:    20,
        },
        _count: { select: { donations: true } },
      },
    });
    if (!project) throw new Error('Project পাওয়া যায়নি');
    return project;
  }

  // ── DONATE ───────────────────────────────────────────
  async donate(
    projectId: string,
    data: {
      amount:     number;
      method:     string;
      paymentRef?: string;
      userId?:    string;
      guestName?:  string;
      guestPhone?: string;
      guestEmail?: string;
    }
  ) {
    // Guest হলে name + phone দরকার
    if (!data.userId && !data.guestName) {
      throw new Error('Guest donation এ নাম এবং phone দিতে হবে');
    }

    // ✅ প্রশ্ন ৬ — Phone validation
    if (!data.userId) {
      if (!data.guestPhone || !/^01[3-9]\d{8}$/.test(data.guestPhone)) {
        throw new Error('সঠিক বাংলাদেশি phone number দিন (যেমন: 01712345678)');
      }
    }

    // ✅ প্রশ্ন ১৫ — Max amount validation
    if (data.amount > 10_00_000) {
      throw new Error('একটি donation-এ সর্বোচ্চ ১০ লক্ষ টাকা দেওয়া যাবে। বড় donation-এর জন্য যোগাযোগ করুন।');
    }

    // Project active কিনা check
    const project = await prisma.donationProject.findUnique({
      where:   { id: projectId },
      include: { org: true },
    });
    if (!project) throw new Error('Project পাওয়া যায়নি');
    if (project.status !== 'active') throw new Error('এই project এ donation বন্ধ');

    // ✅ প্রশ্ন ১৭ — Deadline check
    if (project.deadline && new Date() > new Date(project.deadline)) {
      throw new Error('এই project এর deadline পার হয়ে গেছে');
    }

    // ✅ প্রশ্ন ২, ৩, ১৬ — Atomic transaction + race-safe idempotency
    let donation;
    try {
      donation = await prisma.$transaction(async (tx) => {
        const newDonation = await tx.donation.create({
          data: {
            projectId,
            amount:     data.amount,
            method:     data.method,
            paymentRef: data.paymentRef,
            userId:     data.userId || null,
            guestName:  data.guestName || null,
            guestPhone: data.guestPhone || null,
            guestEmail: data.guestEmail || null,
          },
        });

        await tx.donationProject.update({
          where: { id: projectId },
          data:  { collectedAmount: { increment: data.amount } },
        });

        if (data.userId) {
          await tx.pointLedger.create({
            data: {
              userId: data.userId,
              amount: Math.floor(data.amount / 10),
              reason: 'DONATION',
              refId:  newDonation.id,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            action:     'DONATION_CREATED',
            entityType: 'Donation',
            entityId:   newDonation.id,
            userId:     data.userId || 'guest',
            metadata: {
              amount:    data.amount,
              method:    data.method,
              projectId: projectId,
              guestName: data.guestName,
            },
          },
        });

        return newDonation;
      });
    } catch (err: any) {
      if (err.code === 'P2002' && err.meta?.target?.includes('paymentRef')) {
        throw new Error('এই payment already processed হয়েছে। অনুগ্রহ করে আপনার account/email চেক করুন।');
      }
      throw err;
    }

    // Transaction-এর বাইরে (non-critical) — notification + Redis
    await notificationService.send(
      project.org.adminId,
      'DONATION_RECEIVED',
      `${data.guestName || 'একজন member'} ৳${data.amount} donate করেছেন — ${project.title}`,
      donation.id
    );

    const liveData = {
      id:           donation.id,
      amount:       data.amount,
      method:       data.method,
      donorName:    data.guestName || null,
      projectId,
      projectTitle: project.title,
      createdAt:    donation.createdAt,
    };
    await redis.publish('donation:live', JSON.stringify(liveData));

    return donation;
  }

  // ── DONATION LEDGER (org-scoped) ────────────────────────
  async getDonationLedger(adminId: string, filters: {
    projectId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const requester = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    // SUPER_ADMIN — সব org-এর ledger দেখবে
    if (requester?.role === 'SUPER_ADMIN') {
      const where: any = {};
      if (filters.projectId) where.projectId = filters.projectId;
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
        if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
      }

      return prisma.donation.findMany({
        where,
        select: {
          id: true, amount: true, method: true, paymentRef: true,
          status: true, createdAt: true, guestName: true,
          user: { select: { id: true, name: true } },
          project: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // LOCAL_ADMIN — শুধু নিজের org-এর donation দেখবে
    const adminOrg = await prisma.organization.findFirst({
      where: { adminId },
      select: { id: true },
    });
    if (!adminOrg) throw new Error('Organization পাওয়া যায়নি');

    // projectId দিলে verify করো নিজের org-এর কিনা
    if (filters.projectId) {
      const project = await prisma.donationProject.findFirst({
        where: { id: filters.projectId, orgId: adminOrg.id },
      });
      if (!project) throw new Error('এই project দেখার permission নেই');
    }

    const where: any = {
      project: { orgId: adminOrg.id },
    };
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    return prisma.donation.findMany({
      where,
      select: {
        id: true, amount: true, method: true, paymentRef: true,
        status: true, createdAt: true, guestName: true,
        user: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const donationService = new DonationService();