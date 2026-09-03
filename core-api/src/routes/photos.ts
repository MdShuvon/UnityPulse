import { FastifyInstance } from 'fastify';
import { minioClient, BUCKET } from '../lib/minio';

export async function photoRoutes(app: FastifyInstance) {
  
  // GET /photos/:filename - Serve photo from MinIO
  app.get('/photos/:filename', async (req, reply) => {
    try {
      const { filename } = req.params as { filename: string };
      
      // MinIO থেকে photo stream করে পাঠাও
      const stream = await minioClient.getObject(BUCKET, `post/${filename}`);
      
      reply.raw.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      });
      
      stream.pipe(reply.raw);
      
      // Stream error handle
      stream.on('error', (err) => {
        console.error('MinIO stream error:', err);
        reply.raw.end();
      });
      
    } catch (err) {
      console.error('Photo fetch error:', err);
      reply.code(404).send({ error: 'Photo not found' });
    }
  });
}