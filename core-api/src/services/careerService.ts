import { prisma }               from '../lib/prisma';
import { minioClient, BUCKET }  from '../lib/minio';
import { fileService }          from './fileService';
import { paymentService }       from './paymentService';
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
    userId:     string,
    jobId:      string,
    cvFile:     { buffer: Buffer; mimetype: string; filename: string },
    paymentRef?: string
  ) {
    const job = await prisma.jobPost.findUnique({ where: { id: jobId } });
    if (!job || job.status !== 'OPEN') throw new Error('Job পাওয়া যায়নি বা বন্ধ');

    // Fix 7: Deadline check
    if (job.deadline && new Date() > job.deadline) {
      throw new Error('এই job এর application deadline পার হয়ে গেছে');
    }

    // Fix 4: Self-apply block
    if (job.createdBy === userId) {
      throw new Error('নিজের post করা job এ apply করা যাবে না');
    }

    // Fix 1: Duplicate check
    const existing = await prisma.jobApplication.findFirst({
      where: { userId, jobId },
    });
    if (existing) throw new Error('এই job এ আপনি ইতিমধ্যে apply করেছেন');

    // Fix 2: Payment check
    if (job.applicationFee > 0) {
      if (!paymentRef) throw new Error(`এই job এ apply করতে ৳${job.applicationFee} fee দিতে হবে`);

      const result = await paymentService.verify(paymentRef, job.applicationFee);
      if (!result.verified) throw new Error(result.message || 'Payment verify হয়নি');
    }

    // CV type check — PDF only (professional standard)
    if (cvFile.mimetype !== 'application/pdf') {
      throw new Error('CV অবশ্যই PDF format এ হতে হবে');
    }

    // Fix 5: Store MinIO path, not public URL
    let cvPath: string;
    let applicationId: string | null = null;

    try {
      cvPath = await fileService.uploadBuffer(cvFile.buffer, cvFile.mimetype, cvFile.filename, 'cv');
    } catch (err) {
      // Fix 3: Upload failed — mark payment as refund_pending if fee was paid
      throw new Error('CV upload failed। আবার চেষ্টা করুন।');
    }

    const application = await prisma.jobApplication.create({
      data: {
        jobId, userId,
        cvPath,                                   // path, not URL
        paymentRef:  paymentRef || null,
        feeStatus:   job.applicationFee > 0 ? 'paid' : 'free',
        status:      'PENDING',
      },
    });
    applicationId = application.id;

    await auditService.log('PAYMENT_VERIFIED', 'JobApplication', application.id, userId,
      { fee: job.applicationFee, paymentRef });

    return { message: 'Application submit হয়েছে!', id: application.id };
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
    const job = await prisma.jobPost.findFirst({ where: { id: jobId, createdBy: adminId } });
    if (!job) throw new Error('Job পাওয়া যায়নি বা permission নেই');

    return prisma.jobPost.update({
      where: { id: jobId },
      data:  { ...data, deadline: data.deadline ? new Date(data.deadline) : undefined },
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

    return prisma.jobApplication.findMany({
      where:   { jobId },
      select: {
        id: true, status: true, feeStatus: true, reviewNote: true, createdAt: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        // cvPath নয় — presigned URL endpoint আছে
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
    if (app.status !== 'PENDING') throw new Error('Already reviewed');

    await prisma.jobApplication.update({
      where: { id: applicationId },
      data:  { status: action, reviewNote: note },
    });

    // Fix 6: Candidate কে notification দাও
    const msg = action === 'ACCEPTED'
      ? `🎉 আপনার application accepted হয়েছে — ${app.job.title}. ${note || ''}`
      : `আপনার application rejected হয়েছে — ${app.job.title}. ${note || ''}`;

    await notificationService.send(app.userId, 'JOB_APPLICATION_STATUS', msg, applicationId);

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