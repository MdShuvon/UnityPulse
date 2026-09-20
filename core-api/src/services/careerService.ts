import { prisma }               from '../lib/prisma';
import { minioClient, BUCKET }  from '../lib/minio';
import { fileService }          from './fileService';
import { ApplicationStatus } from '../constants/status';
import { notificationService }  from './notificationService';
import { auditService }         from './auditService';

export class CareerService {

  // ── JOB LIST — filter + search ────────────────────────────────────────
  // Fix 8: department, jobType, search filter support
  async getJobs(filters: {
    q?:          string;
    department?: string;
    jobType?:    string;
    limit?:      number;
    page?:       number;
  } = {}) {
    const { q, department, jobType, limit = 20, page = 1 } = filters;
    const offset = (page - 1) * limit;

    const where: any = { status: 'OPEN' };

    // Fix 7: Expired deadline এর jobs দেখাবে না
    where.OR = [
      { deadline: null },
      { deadline: { gt: new Date() } },
    ];

    if (department) where.department = { contains: department, mode: 'insensitive' };
    if (jobType)    where.jobType    = jobType;
    if (q)          where.title      = { contains: q.trim(), mode: 'insensitive' };

    const [jobs, total] = await Promise.all([
      prisma.jobPost.findMany({
        where,
        select: {
          id: true, title: true, department: true, location: true,
          jobType: true, experience: true, applicationFee: true,
          deadline: true, createdAt: true,
          requirements: true, // requirements সবাই দেখতে পারবে
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset, take: limit,
      }),
      prisma.jobPost.count({ where }),
    ]);

    return { data: jobs, pagination: { page, limit, total, hasMore: offset + jobs.length < total } };
  }

  // ── SINGLE JOB ────────────────────────────────────────────────────────
  async getJob(jobId: string) {
    const job = await prisma.jobPost.findFirst({
      where: { id: jobId, status: 'OPEN' },
      select: {
        id: true, title: true, department: true, location: true,
        jobType: true, description: true, requirements: true,
        experience: true, applicationFee: true, deadline: true,
        createdAt: true,
      },
    });
    if (!job) throw new Error('Job পাওয়া যায়নি বা বন্ধ হয়ে গেছে');
    return job;
  }

  // ── APPLY FOR JOB ─────────────────────────────────────────────────────
  // Fix 1: Duplicate block
  // Fix 2: Payment verify + amount check
  // Fix 3: Upload fail → refund_pending
  // Fix 4: Self-apply block
  // Fix 7: Deadline check
  async applyForJob(
    userId: string,
    jobId:  string,
    cvFile: { buffer: Buffer; mimetype: string; filename: string },
  ) {
    const job = await prisma.jobPost.findUnique({ where: { id: jobId } });
    if (!job || job.status !== 'OPEN') throw new Error('Job পাওয়া যায়নি বা বন্ধ');

    if (job.deadline && new Date() > job.deadline) {
      throw new Error('এই job এর application deadline পার হয়ে গেছে');
    }
    if (job.createdBy === userId) {
      throw new Error('নিজের post করা job এ apply করা যাবে না');
    }

    const needsPayment = job.applicationFee > 0;

    const existing = await prisma.jobApplication.findFirst({ where: { userId, jobId } });
    if (existing) {
      // পেমেন্ট অসমাপ্ত থাকলে নতুন আবেদন না বানিয়ে সেটাতেই ফিরিয়ে দাও
      if (existing.status === ApplicationStatus.PENDING_PAYMENT) {
        return { message: 'পেমেন্ট সম্পন্ন করুন', id: existing.id, requiresPayment: true };
      }
      throw new Error('এই job এ আপনি ইতিমধ্যে apply করেছেন');
    }

    if (cvFile.mimetype !== 'application/pdf') {
      throw new Error('CV অবশ্যই PDF format এ হতে হবে');
    }

    let cvPath: string;
    try {
      cvPath = await fileService.uploadBuffer(cvFile.buffer, cvFile.mimetype, 'cv');
    } catch {
      throw new Error('CV upload failed। আবার চেষ্টা করুন।');
    }

    const application = await prisma.jobApplication.create({
      data: {
        jobId, userId, cvPath,
        feeStatus: 'FREE', // পেমেন্ট verify হলে settle() এটাকে VERIFIED করে
        status: needsPayment ? ApplicationStatus.PENDING_PAYMENT : ApplicationStatus.SUBMITTED,
      },
    });

    return {
      message: needsPayment ? 'পেমেন্ট সম্পন্ন করলে আবেদন জমা হবে' : 'Application submit হয়েছে!',
      id: application.id,
      requiresPayment: needsPayment,
    };
  }

  // ── MY APPLICATIONS ───────────────────────────────────────────────────
  async getMyApplications(userId: string) {
    return prisma.jobApplication.findMany({
      where:   { userId },
      select:  {
        id: true, status: true, feeStatus: true, reviewNote: true, createdAt: true,
        job: { select: { id: true, title: true, department: true, jobType: true } },
        // cvPath নয় — presigned URL দেখাবো
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── PRESIGNED CV URL (Fix 5) ──────────────────────────────────────────
  // CV URL expire হয় — permanent public URL নেই
  async getCvPresignedUrl(applicationId: string, requesterId: string) {
    const app = await prisma.jobApplication.findUnique({
      where:   { id: applicationId },
      include: { job: true },
    });
    if (!app) throw new Error('Application পাওয়া যায়নি');

    // নিজের application অথবা admin
    const requester = await prisma.user.findUnique({
      where:  { id: requesterId },
      select: { role: true },
    });
    const isAdmin = ['SUPER_ADMIN', 'LOCAL_ADMIN'].includes(requester?.role || '');
    if (app.userId !== requesterId && !isAdmin) {
      throw new Error('Permission নেই');
    }

    // 1 ঘণ্টার presigned URL — Fix 5
    const url = await minioClient.presignedGetObject(
      BUCKET,
      app.cvPath,
      60 * 60 // 1 hour in seconds
    );

    return { url, expiresIn: '1 hour' };
  }

  // ── ADMIN: CREATE JOB ─────────────────────────────────────────────────
    // ── ADMIN: PENDING APPLICATIONS (scoped) ──────
  async getPendingApplications(adminId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });
    if (!['SUPER_ADMIN', 'LOCAL_ADMIN'].includes(admin?.role || '')) {
      throw new Error('Admin access দরকার');
    }

    const where: any = { status: 'SUBMITTED' };
    
    // LOCAL_ADMIN scoping
    if (admin?.role === 'LOCAL_ADMIN') {
      const adminOrg = await prisma.organization.findFirst({ where: { adminId } });
      if (!adminOrg) throw new Error('Organization পাওয়া যায়নি');
      where.job = { createdBy: adminId };
    }

    return prisma.jobApplication.findMany({
      where,
      select: {
        id: true, status: true, feeStatus: true, reviewNote: true, createdAt: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        job: { select: { id: true, title: true, department: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── ADMIN: CV Presigned URL (5 min expiry) ────
  async getCvPresignedUrlAdmin(applicationId: string, adminId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });
    if (!['SUPER_ADMIN', 'LOCAL_ADMIN'].includes(admin?.role || '')) {
      throw new Error('Admin access দরকার');
    }

    const app = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
    });
    if (!app) throw new Error('Application পাওয়া যায়নি');

    // LOCAL_ADMIN scoping
    if (admin?.role === 'LOCAL_ADMIN') {
      const job = await prisma.jobPost.findUnique({ where: { id: app.jobId } });
      if (job?.createdBy !== adminId) throw new Error('Permission নেই');
    }

    // ৫ মিনিট expiry
    const url = await minioClient.presignedGetObject(
      BUCKET,
      app.cvPath,
      5 * 60 // 5 minutes
    );

    return { url, expiresIn: '5 minutes' };
  }
  
  async createJob(adminId: string, data: {
    title: string; department: string; location: string;
    jobType: string; description: string; requirements: string;
    experience?: string; applicationFee?: number; deadline?: string;
  }) {
    // Only super admin
    const admin = await prisma.user.findUnique({
      where:  { id: adminId }, select: { role: true },
    });
    if (admin?.role !== 'SUPER_ADMIN') throw new Error('Super admin only');

    return prisma.jobPost.create({
      data: {
        ...data,
        applicationFee: data.applicationFee || 0,
        deadline:       data.deadline ? new Date(data.deadline) : null,
        createdBy:      adminId,
      },
    });
  }

  // ── ADMIN: UPDATE JOB ─────────────────────────────────────────────────
  async updateJob(adminId: string, jobId: string, data: {
    status?: string; deadline?: string;
    title?: string; description?: string;
  }) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });
    
    const job = await prisma.jobPost.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Job পাওয়া যায়নি');
    
    // SUPER_ADMIN can edit any job, LOCAL_ADMIN only own jobs
    if (admin?.role !== 'SUPER_ADMIN' && job.createdBy !== adminId) {
      throw new Error('Permission নেই');
    }

    return prisma.jobPost.update({
      where: { id: jobId },
      data:  { ...data, status: data.status as 'OPEN' | 'CLOSED' | undefined, deadline: data.deadline ? new Date(data.deadline) : undefined },
    });
  }

  // ── ADMIN: JOB APPLICATIONS ───────────────────────────────────────────
  async getJobApplications(jobId: string, adminId: string) {
    const job = await prisma.jobPost.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Job পাওয়া যায়নি');

    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });
    if (!['SUPER_ADMIN', 'LOCAL_ADMIN'].includes(admin?.role || '')) {
      throw new Error('Admin access দরকার');
    }

    // LOCAL_ADMIN scoping - only own org's jobs
    if (admin?.role === 'LOCAL_ADMIN') {
      const adminOrg = await prisma.organization.findFirst({ where: { adminId } });
      if (!adminOrg || job.createdBy !== adminId) {
        throw new Error('Permission নেই');
      }
    }

    return prisma.jobApplication.findMany({
      where: { status: { not: ApplicationStatus.PENDING_PAYMENT } },
      select: {
        id: true, status: true, feeStatus: true, reviewNote: true, createdAt: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── ADMIN: REVIEW APPLICATION ─────────────────────────────────────────
  // Fix 6: Notification পাঠাও
  async reviewApplication(
    adminId: string,
    applicationId: string,
    action: 'ACCEPTED' | 'REJECTED',
    note?: string
  ) {
    const app = await prisma.jobApplication.findUnique({
      where:   { id: applicationId },
      include: { job: true },
    });
    if (!app) throw new Error('Application পাওয়া যায়নি');
    if (app.status !== 'SUBMITTED') throw new Error('Already reviewed');

    await prisma.jobApplication.update({
      where: { id: applicationId },
      data:  { status: action, reviewNote: note },
    });

    // Fix 6: Candidate কে notification দাও
    const msg = action === 'ACCEPTED'
      ? `🎉 আপনার application accepted হয়েছে। ${note || ''}`
      : `আপনার application rejected হয়েছে। ${note || ''}`;

    await notificationService.send(
      app.userId, 
      'JOB_APPLICATION_STATUS', 
      msg, 
      applicationId,
      app.job.title  // ← ADD
    );

    await auditService.log('ADMIN_ACTION', 'JobApplication', applicationId, adminId, { action, note });

    return { message: `Application ${action}` };
  }

  // ── ADMIN: ALL JOBS ───────────────────────────────────────────────────
  async getAllJobsAdmin(adminId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId }, select: { role: true },
    });
    if (!['SUPER_ADMIN', 'LOCAL_ADMIN'].includes(admin?.role || '')) {
      throw new Error('Admin access দরকার');
    }

    return prisma.jobPost.findMany({
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}



export const careerService = new CareerService();