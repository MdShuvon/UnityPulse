import { prisma } from '../lib/prisma';
import { fileService } from './fileService';
import { MultipartFile } from '@fastify/multipart';

export class ProfileService {

  // Profile update
  async update(userId: string, data: {
    bio?:           string | null;
    dateOfBirth?:   string | null;
    gender?:        string | null;
    address?:       string | null;
    occupation?:    string | null;
    profilePhoto?:  string | null;
  }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        bio: data.bio !== undefined ? data.bio : undefined,
        dateOfBirth: data.dateOfBirth
          ? new Date(data.dateOfBirth)
          : data.dateOfBirth === null ? null : undefined,
        gender: data.gender !== undefined ? data.gender : undefined,
        address: data.address !== undefined ? data.address : undefined,
        occupation: data.occupation !== undefined ? data.occupation : undefined,
        profilePhoto: data.profilePhoto !== undefined ? data.profilePhoto : undefined,
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
    // Use 'documents' folder for profile photos (no compression)
    const path = await fileService.upload(file, 'documents');
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
    // ── PUBLIC POSTS (only PUBLIC visibility) ──────
  async getPublicPosts(userId: string, limit: number, page: number) {
    const offset = (page - 1) * limit;
    
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: {
          userId,
          visibility: 'PUBLIC',
          isDeleted: false,
          isHidden: false,
        },
        include: {
          user: { select: { id: true, name: true, profilePhoto: true } },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.post.count({
        where: {
          userId,
          visibility: 'PUBLIC',
          isDeleted: false,
          isHidden: false,
        },
      }),
    ]);

    return { data: posts, pagination: { page, limit, total, hasMore: offset + posts.length < total } };
  }

  // ── FOLLOW/UNFOLLOW ────────────────────────────
  async toggleFollow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new Error('নিজেকে follow করা যাবে না');
    }

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (existing) {
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId } },
      });
      return { following: false };
    }

    await prisma.follow.create({
      data: { followerId, followingId },
    });
    return { following: true };
  }

  // ── IS FOLLOWING CHECK ─────────────────────────
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return !!follow;
  }

  // ── FOLLOW COUNTS ──────────────────────────────
  async getFollowCounts(userId: string) {
    const [followers, following] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);
    return { followers, following };
  }
}

export const profileService = new ProfileService();