// causeService.ts

import { prisma } from '../lib/prisma';
import { notificationService } from './notificationService';

export class CauseService {

  // ── PUBLIC: Get Featured Causes (Home page) ────
  async getActiveCauses() {
    return prisma.cause.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 5, // Home page-এ ৫টা Cause দেখান
      include: {
        projects: {
          where: { status: 'active' },
          include: {
            org: { select: { id: true, name: true } },
          },
        },
        faqs: { orderBy: { order: 'asc' } },
        _count: { select: { joinRequests: { where: { status: 'PENDING' } } } },
      },
    });
  }

  // ── PUBLIC: Get Single Cause Detail ────────────
  async getCauseDetail(causeId: string) {
    const cause = await prisma.cause.findUnique({
      where: { id: causeId, status: 'ACTIVE' },
      include: {
        projects: {
          where: { status: 'active' },
          include: {
            org: { select: { id: true, name: true } },
            expenses: true,
            _count: { select: { donations: true } },
          },
        },
        faqs: { orderBy: { order: 'asc' } },
      },
    });

    if (!cause) throw new Error('Cause পাওয়া যায়নি');

    const totalRaised = cause.projects.reduce((sum, p) => sum + p.collectedAmount, 0);
    const totalSpent = cause.projects.reduce(
      (sum, p) => sum + p.expenses.reduce((s, e) => s + e.amount, 0),
      0
    );

    return {
      ...cause,
      report: {
        totalRaised,
        totalSpent,
        expenses: cause.projects.flatMap(p =>
          p.expenses.map(e => ({ ...e, projectTitle: p.title }))
        ),
      },
    };
  }

  // ── SUPER_ADMIN: Create Cause ──────────────────
  async createCause(adminId: string, data: {
    title: string; story: string; coverImage?: string; isFeatured?: boolean;
  }) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });
    if (admin?.role !== 'SUPER_ADMIN') throw new Error('শুধু Super Admin Cause তৈরি করতে পারে');

    if (data.isFeatured) {
      await prisma.cause.updateMany({
        where: { isFeatured: true },
        data: { isFeatured: false },
      });
    }

    return prisma.cause.create({
      data: {
        title: data.title,
        story: data.story,
        coverImage: data.coverImage,
        isFeatured: data.isFeatured || false,
        createdBy: adminId,
      },
    });
  }

  // ── SUPER_ADMIN: List Causes ───────────────────
  async getAdminCauses(adminId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });
    if (admin?.role !== 'SUPER_ADMIN') throw new Error('Permission denied');

    return prisma.cause.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            projects: true,
            joinRequests: { where: { status: 'PENDING' } },
            faqs: true,
          },
        },
      },
    });
  }

  // ── SUPER_ADMIN: Update Cause ──────────────────
  async updateCause(adminId: string, causeId: string, data: any) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });
    if (admin?.role !== 'SUPER_ADMIN') throw new Error('Permission denied');

    if (data.isFeatured) {
      await prisma.cause.updateMany({
        where: { isFeatured: true, id: { not: causeId } },
        data: { isFeatured: false },
      });
    }

    return prisma.cause.update({
      where: { id: causeId },
      data: {
        title: data.title,
        story: data.story,
        coverImage: data.coverImage,
        isFeatured: data.isFeatured,
        status: data.status,
      },
    });
  }

  // ── LOCAL_ADMIN: Submit Join Request ───────────
  async submitJoinRequest(
    adminId: string,
    causeId: string,
    data: { projectId: string; note?: string }
  ) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });
    if (!['LOCAL_ADMIN', 'SUPER_ADMIN'].includes(admin?.role || '')) {
      throw new Error('Admin access দরকার');
    }

    // Verify project belongs to this admin's org
    const project = await prisma.donationProject.findUnique({
      where: { id: data.projectId },
      include: { org: true },
    });
    if (!project) throw new Error('Project পাওয়া যায়নি');

    if (admin?.role === 'LOCAL_ADMIN') {
      const adminOrg = await prisma.organization.findFirst({
        where: { adminId },
      });
      if (!adminOrg || project.orgId !== adminOrg.id) {
        throw new Error('শুধু নিজের org-এর project request করতে পারবেন');
      }
    }

    // Check if already pending
    const existing = await prisma.causeJoinRequest.findFirst({
      where: {
        causeId,
        projectId: data.projectId,
        status: 'PENDING',
      },
    });
    if (existing) throw new Error('এই project-এর request already pending আছে');

    // Check cause is active
    const cause = await prisma.cause.findUnique({ where: { id: causeId } });
    if (!cause || cause.status !== 'ACTIVE') {
      throw new Error('Cause active নয়');
    }

    return prisma.causeJoinRequest.create({
      data: {
        causeId,
        projectId: data.projectId,
        requestedBy: adminId,
        note: data.note,
      },
    });
  }

  // ── SUPER_ADMIN: Get Pending Join Requests ─────
  async getPendingJoinRequests(adminId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });
    if (admin?.role !== 'SUPER_ADMIN') throw new Error('Permission denied');

    return prisma.causeJoinRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        cause: { select: { id: true, title: true, status: true } },
        project: {
          include: {
            org: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── SUPER_ADMIN: Review Join Request ───────────
  async reviewJoinRequest(
    adminId: string,
    requestId: string,
    decision: 'APPROVED' | 'REJECTED',
    reviewNote?: string
  ) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });
    if (admin?.role !== 'SUPER_ADMIN') throw new Error('Permission denied');

    if (decision === 'REJECTED' && !reviewNote) {
      throw new Error('Reject করলে কারণ লিখতে হবে');
    }

    const request = await prisma.causeJoinRequest.findUnique({
      where: { id: requestId },
      include: { cause: true },
    });
    if (!request) throw new Error('Request পাওয়া যায়নি');
    if (request.status !== 'PENDING') throw new Error('Already reviewed');

    // Ensure cause is still active when approving
    if (decision === 'APPROVED' && request.cause.status !== 'ACTIVE') {
      throw new Error('CLOSED Cause-এ project approve করা যাবে না');
    }

    const updated = await prisma.causeJoinRequest.update({
      where: { id: requestId },
      data: {
        status: decision,
        reviewNote: decision === 'REJECTED' ? reviewNote : null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    if (decision === 'APPROVED') {
      await prisma.donationProject.update({
        where: { id: request.projectId },
        data: { causeId: request.causeId },
      });

      await notificationService.send(
        request.requestedBy,
        'CAUSE_JOIN_APPROVED',
        `আপনার project "${request.cause.title}" Cause-এ যুক্ত হয়েছে`,
        request.causeId
      );
    } else {
      await notificationService.send(
        request.requestedBy,
        'CAUSE_JOIN_REJECTED',
        `আপনার Cause join request প্রত্যাখ্যাত: ${reviewNote}`,
        request.causeId
      );
    }

    return updated;
  }

  // ── SUPER_ADMIN: Add FAQ ───────────────────────
  async addFaq(adminId: string, causeId: string, data: { question: string; answer: string; order?: number }) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });
    if (admin?.role !== 'SUPER_ADMIN') throw new Error('Permission denied');

    return prisma.faqItem.create({
      data: {
        causeId,
        question: data.question,
        answer: data.answer,
        order: data.order || 0,
      },
    });
  }
}

export const causeService = new CauseService();