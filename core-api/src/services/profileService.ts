import { prisma } from '../lib/prisma';
import { fileService } from './fileService';
import { MultipartFile } from '@fastify/multipart';

export class ProfileService {

  // Profile update
  async update(userId: string, data: {
    bio?:         string;
    dateOfBirth?: string;
    gender?:      string;
    address?:     string;
    occupation?:  string;
  }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth
          ? new Date(data.dateOfBirth)
          : undefined,
      },
      select: {
        id: true, name: true, email: true, bio: true,
        dateOfBirth: true, gender: true, address: true,
        occupation: true, profilePhoto: true,
        privacySettings: true,
      },
    });
    return user;
  }

  // Profile photo upload
  async uploadPhoto(userId: string, file: MultipartFile) {
    const path = await fileService.upload(file, 'post');
    const url  = fileService.getUrl(path);

    await prisma.user.update({
      where: { id: userId },
      data:  { profilePhoto: url },
    });

    return { profilePhoto: url };
  }

  // Privacy toggle — field level control
  async togglePrivacy(
    userId: string,
    field: string,
    isPublic: boolean
  ) {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { privacySettings: true },
    });

    const current = (user?.privacySettings as Record<string, boolean>) || {};
    current[field] = isPublic;

    await prisma.user.update({
      where: { id: userId },
      data:  { privacySettings: current },
    });

    return { message: `${field} privacy updated` };
  }

  // Public profile — privacy settings অনুযায়ী filter করো
  async getPublicProfile(userId: string, viewerId?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, bio: true, profilePhoto: true,
        occupation: true, dateOfBirth: true, phone: true,
        address: true, gender: true, role: true,
        privacySettings: true, createdAt: true,
        points: { select: { amount: true, reason: true } },
      },
    });

    if (!user) throw new Error('User পাওয়া যায়নি');

    // নিজের profile হলে সব দেখাবে
    if (viewerId === userId) return user;

    // Privacy settings অনুযায়ী filter
    const privacy = (user.privacySettings as Record<string, boolean>) || {};
    const result: any = {
      id: user.id, name: user.name,
      bio: user.bio, profilePhoto: user.profilePhoto,
      role: user.role, createdAt: user.createdAt,
    };

    if (privacy.occupation !== false) result.occupation = user.occupation;
    if (privacy.dateOfBirth !== false) result.dateOfBirth = user.dateOfBirth;
    if (privacy.phone      !== false) result.phone      = user.phone;
    if (privacy.address    !== false) result.address    = user.address;
    if (privacy.gender     !== false) result.gender     = user.gender;

    return result;
  }
}

export const profileService = new ProfileService();