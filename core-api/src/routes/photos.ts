import { FastifyInstance } from 'fastify';
import { minioClient, BUCKET, getFileUrl } from '../lib/minio';
import { requireAdmin } from '../middleware/authGuard';

export async function photoRoutes(app: FastifyInstance) {

  // POST /photos/upload - Upload photo (multipart)
  app.post('/photos/upload', { preHandler: requireAdmin }, async (req, reply) => {
    try {
      const parts = req.parts();
      let uploadedUrl = '';

      for await (const part of parts) {
        if (part.type === 'file') {
          // ── File type validation ──
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
          if (!allowedTypes.includes(part.mimetype)) {
            return reply.code(400).send({ error: 'শুধু JPG, PNG, WebP অনুমোদিত' });
          }

          // ── File size validation ──
          const chunks: Buffer[] = [];
          let totalSize = 0;
          for await (const chunk of part.file) {
            totalSize += chunk.length;
            if (totalSize > 10 * 1024 * 1024) {
              return reply.code(400).send({ error: 'সর্বোচ্চ ১০MB অনুমোদিত' });
            }
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);

          const ext = part.filename.split('.').pop() || 'jpg';
          const filename = `cause/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

          await minioClient.putObject(BUCKET, filename, buffer, buffer.length, {
            'Content-Type': part.mimetype,
          });

          uploadedUrl = getFileUrl(filename);
        }
      }

      if (!uploadedUrl) {
        return reply.code(400).send({ error: 'কোনো ফাইল পাওয়া যায়নি' });
      }

      return reply.code(201).send({ url: uploadedUrl });
    } catch (err) {
      console.error('Photo upload error:', err);
      return reply.code(500).send({ error: 'ছবি upload করতে সমস্যা হয়েছে' });
    }
  });
  
  // GET /photos/:filename - Redirect to MinIO public URL
  app.get('/photos/:filename', async (req, reply) => {
    try {
      const { filename } = req.params as { filename: string };
      const publicUrl = getFileUrl(`cause/${filename}`);
      return reply.redirect(publicUrl);
    } catch (err) {
      console.error('Photo redirect error:', err);
      return reply.code(404).send({ error: 'Photo not found' });
    }
  });
}