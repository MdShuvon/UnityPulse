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
    orgId:       string;
    deadline?:   string;
  }) {
    // Admin ওই org এর admin কিনা check
    const org = await prisma.organization.findFirst({
      where: { id: data.orgId, adminId },
    });
    if (!org) throw new Error('এই organization এর admin না আপনি');

    const project = await prisma.donationProject.create({
      data: {
        title:       data.title,
        description: data.description,
        goalAmount:  data.goalAmount,
        orgId:       data.orgId,
        createdBy:   adminId,
        deadline:    data.deadline ? new Date(data.deadline) : null,
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
    return prisma.donationProject.findMany({
      where: { createdBy: adminId },
      include: {
        _count: { select: { donations: true } },
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
          take:    20, // last 20 donations
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
      // Member donation
      userId?:    string;
      // Guest donation
      guestName?:  string;
      guestPhone?: string;
      guestEmail?: string;
    }
  ) {
    // Idempotent check — same paymentRef দুইবার না
    if (data.paymentRef) {
      const dup = await prisma.donation.findUnique({
        where: { paymentRef: data.paymentRef },
      });
      if (dup) throw new Error('এই payment already processed হয়েছে');
    }

    // Guest হলে name + phone দরকার
    if (!data.userId && !data.guestName) {
      throw new Error('Guest donation এ নাম এবং phone দিতে হবে');
    }

    // Project active কিনা check
    const project = await prisma.donationProject.findUnique({
      where:   { id: projectId },
      include: { org: true },
    });
    if (!project) throw new Error('Project পাওয়া যায়নি');
    if (project.status !== 'active') throw new Error('এই project এ donation বন্ধ');

    // Donation create
    const donation = await prisma.donation.create({
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

    // Project এর collectedAmount update
    await prisma.donationProject.update({
      where: { id: projectId },
      data:  { collectedAmount: { increment: data.amount } },
    });

    // Member হলে point add
    if (data.userId) {
      await pointService.add(
        data.userId,
        Math.floor(data.amount / 10), // প্রতি ১০ টাকায় ১ point
        'DONATION',
        donation.id
      );
    }

    // Immutable audit log
    await auditService.log(
      'DONATION_CREATED', 'Donation',
      donation.id,
      data.userId || 'guest',
      {
        amount:    data.amount,
        method:    data.method,
        projectId, guestName: data.guestName
      }
    );

    // Org admin কে notification
    await notificationService.send(
      project.org.adminId,
      'DONATION_RECEIVED',
      `${data.guestName || 'একজন member'} ৳${data.amount} donate করেছেন — ${project.title}`,
      donation.id
    );

    // Redis publish → SSE live feed
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
}

export const donationService = new DonationService();