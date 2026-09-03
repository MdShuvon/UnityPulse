import { FastifyInstance } from 'fastify';
import { profileService } from '../services/profileService';
import { updateProfileSchema, togglePrivacySchema } from '../schemas/profileSchema';
import { requireAuth } from '../middleware/authGuard';

export async function profileRoutes(app: FastifyInstance) {

  // GET /profile/me — নিজের profile
  app.get('/profile/me',
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = (req.session as any).userId;
      const profile = await profileService.getPublicProfile(userId, userId);
      return reply.send(profile);
    }
  );

  // GET /profile/:id — কারো public profile
  app.get('/profile/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const viewerId = (req.session as any)?.userId;
    const profile = await profileService.getPublicProfile(id, viewerId);
    return reply.send(profile);
  });

  // GET /profile/:id/posts — public posts only
  app.get('/profile/:id/posts', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { limit = '20', page = '1' } = req.query as any;
    const posts = await profileService.getPublicPosts(id, Math.max(1, +limit), Math.max(1, +page));
    return reply.send(posts);
  });

  // POST /profile/:id/follow — follow/unfollow
  app.post('/profile/:id/follow',
    { preHandler: requireAuth },
    async (req, reply) => {
      const viewerId = (req.session as any).userId;
      const { id } = req.params as { id: string };
      const result = await profileService.toggleFollow(viewerId, id);
      return reply.send(result);
    }
  );

  // GET /profile/:id/follow-counts
  app.get('/profile/:id/follow-counts', async (req, reply) => {
    const { id } = req.params as { id: string };
    const counts = await profileService.getFollowCounts(id);
    return reply.send(counts);
  });

  // GET /profile/:id/is-following
  app.get('/profile/:id/is-following',
    { preHandler: requireAuth },
    async (req, reply) => {
      const viewerId = (req.session as any).userId;
      const { id } = req.params as { id: string };
      const following = await profileService.isFollowing(viewerId, id);
      return reply.send({ isFollowing: following });
    }
  );

  // PATCH /profile — update
  app.patch('/profile',
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = (req.session as any).userId;
      const data   = updateProfileSchema.parse(req.body);
      const result = await profileService.update(userId, data);
      return reply.send(result);
    }
  );

  // POST /profile/photo — photo upload
  app.post('/profile/photo',
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = (req.session as any).userId;
      const data   = await req.file();
      if (!data) return reply.code(400).send({ error: 'File দাও' });
      const result = await profileService.uploadPhoto(userId, data);
      return reply.send(result);
    }
  );

  // PATCH /profile/privacy — field privacy toggle
  app.patch('/profile/privacy',
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = (req.session as any).userId;
      const { field, isPublic } = togglePrivacySchema.parse(req.body);
      const result = await profileService.togglePrivacy(userId, field, isPublic);
      return reply.send(result);
    }
  );
}