import { prisma } from '../lib/prisma';
import { fileService } from './fileService';
import { notificationService } from './notificationService';
import { auditService } from './auditService';
import { MultipartFile } from '@fastify/multipart';
import CryptoJS from 'crypto-js';

const NID_KEY = process.env.NID_ENCRYPTION_KEY || 'default-key-change-this!!!!!!!!';

// NID encrypt করো — DB তে plain text যাবে না
function encryptNid(nid: string): string {
  return CryptoJS.AES.encrypt(nid, NID_KEY).toString();
}

// NID decrypt করো — শুধু admin এ দেখানোর জন্য
function decryptNid(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, NID_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export class OrgService {

  // সব Area list
  async getAreas() {
    return prisma.area.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Area অনুযায়ী Organization list
  async getOrgsByArea(areaId: string) {
    return prisma.organization.findMany({
      where:   { areaId, isActive: true },
      select: {
        id: true, name: true, description: true,
        _count: { select: { memberships: true } },
      },
    });
  }

  // Organization এর members
  async getOrgMembers(orgId: string) {
    return prisma.orgMembership.findMany({
      where:  { orgId, status: 'APPROVED' },
      select: {
        id: true, joinedAt: true,
        user: {
          select: { id: true, name: true, profilePhoto: true, role: true },
        },
      },
    });
  }

  // Join request পাঠাও
  async joinRequest(
    userId: string,
    orgId: string,
    nidNumber: string,
    nidPhotoFile: MultipartFile
  ) {
    // একটাই org join করা যাবে
    const existing = await prisma.orgMembership.findFirst({
      where: { userId, status: { in: ['PENDING', 'APPROVED'] } },
    });
    if (existing) throw new Error('আপনি ইতিমধ্যে একটি organization এ আছেন');

    // NID photo upload via FileService
    const nidPath = await fileService.upload(nidPhotoFile, 'nid');
    const nidUrl  = fileService.getUrl(nidPath);

    // NID number encrypt করো
    const encryptedNid = encryptNid(nidNumber);

    const membership = await prisma.orgMembership.create({
      data: {
        userId, orgId,
        nidNumber: encryptedNid, // encrypted
        nidPhoto:  nidUrl,
        status:    'PENDING',
      },
    });

    // Org admin কে notification দাও
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (org) {
      await notificationService.send(
        org.adminId,
        'GENERAL',
        'নতুন membership request এসেছে — KYC review করুন',
        membership.id
      );
    }

    return { message: 'Request পাঠানো হয়েছে, admin review করবে', id: membership.id };
  }

  // Admin — pending KYC list
  async getPendingKyc(adminId: string) {
    // Admin এর org খুঁজে বের করো
    const org = await prisma.organization.findFirst({
      where: { adminId },
    });
    if (!org) throw new Error('Organization পাওয়া যায়নি');

    return prisma.orgMembership.findMany({
      where: { orgId: org.id, status: 'PENDING' },
      select: {
        id: true, nidPhoto: true, createdAt: true,
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });
  }

  // Admin — KYC approve বা reject
  async reviewKyc(
    adminId: string,
    membershipId: string,
    action: 'APPROVED' | 'REJECTED',
    note?: string
  ) {
    const membership = await prisma.orgMembership.findUnique({
      where: { id: membershipId },
      include: { org: true },
    });
    if (!membership) throw new Error('Request পাওয়া যায়নি');
    if (membership.org.adminId !== adminId) throw new Error('Permission নেই');

    await prisma.orgMembership.update({
      where: { id: membershipId },
      data: {
        status:   action,
        joinedAt: action === 'APPROVED' ? new Date() : null,
      },
    });

    // User কে notification দাও
    await notificationService.send(
      membership.userId,
      action === 'APPROVED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
      action === 'APPROVED'
        ? 'আপনার membership approve হয়েছে!'
        : `আপনার membership reject হয়েছে। ${note || ''}`,
      membershipId
    );

    // Audit log
    await auditService.log(
      action === 'APPROVED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
      'OrgMembership',
      membershipId,
      adminId,
      { note }
    );

    return { message: `KYC ${action}` };
  }

  // Admin — NID number decrypt করে দেখাও
  async getDecryptedNid(adminId: string, membershipId: string) {
    const membership = await prisma.orgMembership.findUnique({
      where: { id: membershipId },
      include: { org: true },
    });
    if (!membership) throw new Error('পাওয়া যায়নি');
    if (membership.org.adminId !== adminId) throw new Error('Permission নেই');

    return { nidNumber: decryptNid(membership.nidNumber) };
  }
}

export const orgService = new OrgService();