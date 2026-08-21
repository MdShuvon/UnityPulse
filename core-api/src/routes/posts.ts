import { FastifyInstance } from 'fastify';
import { postService }     from '../services/postService';
import { requireAuth }     from '../middleware/authGuard';
import {
  createPostSchema, editPostSchema, editCommentSchema,
  createCommentSchema, reportSchema,
} from '../schemas/postSchema';

export async function postRoutes(app: FastifyInstance) {

  // POST /posts — Fix 6: buffer করো
  // POST /posts
app.post('/posts', { preHandler: requireAuth }, async (req, reply) => {
  const userId = (req.session as any).userId;
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('multipart/form-data')) {
    // Multipart with photos
    const bufferedFiles: any[] = [];
    let bodyData: any = {};

    for await (const part of req.parts()) {
      if (part.type === 'file' && part.fieldname === 'photos') {
        if (bufferedFiles.length >= 5) { for await (const _ of part.file) {} continue; }
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        bufferedFiles.push({ buffer: Buffer.concat(chunks), mimetype: part.mimetype, filename: part.filename });
      } else if (part.type === 'field') {
        try { bodyData = JSON.parse(part.value as string); } catch { bodyData[part.fieldname as string] = part.value; }
      }
    }

    const data = createPostSchema.parse(bodyData);
    const result = await postService.createPost(userId, data, bufferedFiles);
    return reply.code(201).send(result);
  } else {
    // JSON only (no photos)
    const data = createPostSchema.parse(req.body);
    const result = await postService.createPost(userId, data, []);
    return reply.code(201).send(result);
  }
});

  app.get('/posts/press', async (req, reply) => {
    const { limit = '20', page = '1' } = req.query as any;
    return reply.send(await postService.getPressFeed(Math.max(1, +limit), Math.max(1, +page)));
  });

  app.get('/posts/feed', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req.session as any).userId;
    const { limit = '20', page = '1' } = req.query as any;
    return reply.send(await postService.getOrgFeed(userId, Math.max(1, +limit), Math.max(1, +page)));
  });

  app.get('/posts/:id', async (req, reply) => {
    return reply.send(await postService.getSinglePost((req.params as any).id));
  });

  app.patch('/posts/:id', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req.session as any).userId;
    const data   = editPostSchema.parse(req.body);
    return reply.send(await postService.editPost(userId, (req.params as any).id, data));
  });

  app.delete('/posts/:id', { preHandler: requireAuth }, async (req, reply) => {
    return reply.send(await postService.deletePost((req.session as any).userId, (req.params as any).id));
  });

  // POST /posts/:id/like — post like toggle
  app.post('/posts/:id/like', { preHandler: requireAuth }, async (req, reply) => {
    return reply.send(await postService.togglePostLike((req.session as any).userId, (req.params as any).id));
  });

  // Comments
  app.post('/posts/:id/comments', { preHandler: requireAuth }, async (req, reply) => {
    const userId            = (req.session as any).userId;
    const { content, parentId } = createCommentSchema.parse(req.body);
    return reply.code(201).send(await postService.createComment(userId, (req.params as any).id, content, parentId));
  });

  // Fix 8: paginated comments
  app.get('/posts/:id/comments', async (req, reply) => {
    const { limit = '20', page = '1' } = req.query as any;
    return reply.send(await postService.getComments((req.params as any).id, Math.max(1, +limit), Math.max(1, +page)));
  });

  // Fix 1: Comment edit
  app.patch('/posts/:postId/comments/:commentId', { preHandler: requireAuth }, async (req, reply) => {
    const userId  = (req.session as any).userId;
    const { commentId } = req.params as any;
    const { content }   = editCommentSchema.parse(req.body);
    return reply.send(await postService.editComment(userId, commentId, content));
  });

  // Fix 2: Comment delete
  app.delete('/posts/:postId/comments/:commentId', { preHandler: requireAuth }, async (req, reply) => {
    return reply.send(await postService.deleteComment((req.session as any).userId, (req.params as any).commentId));
  });

  // Fix 3: Comment like
  app.post('/posts/:postId/comments/:commentId/like', { preHandler: requireAuth }, async (req, reply) => {
    return reply.send(await postService.toggleCommentLike((req.session as any).userId, (req.params as any).commentId));
  });

  // Report
  app.post('/posts/:id/report', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req.session as any).userId;
    const { reason, targetType } = reportSchema.parse(req.body);
    return reply.send(await postService.reportContent(userId, (req.params as any).id, targetType, reason));
  });

  // Fix 9: User's posts for profile
  app.get('/users/:userId/posts', async (req, reply) => {
    const { userId }  = req.params as any;
    const viewerId    = (req.session as any)?.userId || null;
    const { limit = '20', page = '1' } = req.query as any;
    return reply.send(await postService.getUserPosts(userId, viewerId, Math.max(1, +limit), Math.max(1, +page)));
  });

  // Search
  app.get('/search', async (req, reply) => {
    return reply.send(await postService.searchUsers((req.query as any).q || ''));
  });
}