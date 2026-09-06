import Fastify from 'fastify';
import helmet       from '@fastify/helmet';
import cors         from '@fastify/cors';
import rateLimit    from '@fastify/rate-limit';
import multipart    from '@fastify/multipart';
import fastifyCookie  from '@fastify/cookie';
import fastifySession from '@fastify/session';

import { redis, setupRedisListeners } from './lib/redis';
import { ensureBucket }   from './lib/minio';

// ── Routes ───────────────────────────────────────
import { authRoutes }         from './routes/auth';
import { profileRoutes }      from './routes/profile';
import { orgRoutes }          from './routes/organizations';
import { donationRoutes }     from './routes/donations';
import { searchRoutes } from './routes/search';
import { taskRoutes } from './routes/tasks';
import { causeRoutes } from './routes/causes';
import { leaderboardRoutes }  from './routes/leaderboard';
import { postRoutes }         from './routes/posts';
import { photoRoutes }        from './routes/photos';
import { careerRoutes }       from './routes/career';
import { dashboardRoutes }    from './routes/dashboard';
import { notificationRoutes } from './routes/notifications';
import { localAdminRoutes }   from './routes/localAdmin';

import { adminUserRoutes } from './routes/admin/users';
import { adminDonationRoutes } from './routes/admin/donations';
import { adminKycRoutes }      from './routes/admin/kyc';
import { adminTaskRoutes }     from './routes/admin/tasks';
import { adminPostRoutes }     from './routes/admin/posts';
import { adminCareerRoutes }   from './routes/admin/career';
import { superAdminRoutes } from './routes/superAdmin';
import { passwordResetRoutes } from './routes/passwordReset';
import googleOAuthPlugin from './plugins/googleOAuth';



const app = Fastify({ logger: true });


async function start() {
  // ── Security ────────────────────────────────────
  await app.register(helmet, { contentSecurityPolicy: false });

  await app.register(cors, {
    origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  await app.register(rateLimit, {
    max:        100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error:   'Too Many Requests',
      message: 'অনেক বেশি request — একটু অপেক্ষা করো',
    }),
  });

  // ── File upload ─────────────────────────────────
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  });

  // ── Cookie + Session ────────────────────────────
  await app.register(fastifyCookie);

  await app.register(fastifySession, {
    secret: process.env.SESSION_SECRET || 'unitypulse-secret-key-minimum-32-chars',
    cookie: {
      secure:   false, // production এ true করো
      httpOnly: true,
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
    },
    store: {
      get: async (sid, cb) => {
        const data = await redis.get(`sess:${sid}`);
        cb(null, data ? JSON.parse(data) : null);
      },
      set: async (sid, session, cb) => {
        await redis.set(`sess:${sid}`, JSON.stringify(session), 'EX', 604800);
        cb(null);
      },
      destroy: async (sid, cb) => {
        await redis.del(`sess:${sid}`);
        cb(null);
      },
    },
  });

  // ── External services ───────────────────────────
  await ensureBucket();
  await setupRedisListeners();

  // ── Health check ────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', time: new Date() }));
    // ── Google OAuth Plugin (আগে register করতে হবে) ──
  await app.register(googleOAuthPlugin);


  // ── Public + Member routes ──────────────────────
  await app.register(authRoutes);
  await app.register(profileRoutes);
  await app.register(orgRoutes);
  await app.register(donationRoutes);
  await app.register(taskRoutes);
  await app.register(causeRoutes);
  await app.register(searchRoutes);
  await app.register(leaderboardRoutes);
  await app.register(postRoutes);
  await app.register(photoRoutes);
  await app.register(careerRoutes);
  await app.register(dashboardRoutes);
  await app.register(notificationRoutes);
  await app.register(localAdminRoutes);
  await app.register(passwordResetRoutes);
  // ── Admin routes ────────────────────────────────
  await app.register(adminKycRoutes);
  await app.register(adminDonationRoutes);
  await app.register(adminTaskRoutes);
  await app.register(adminPostRoutes);
  await app.register(adminCareerRoutes);
  await app.register(superAdminRoutes);
  await app.register(adminUserRoutes);


  // ── Global error handler ────────────────────────
  app.setErrorHandler((error, req, reply) => {
    app.log.error(error);
    const status = error.statusCode || 500;
    reply.code(status).send({
      error: error.message,
      message: error.message,
    });
  });

  await app.listen({ port: 3001, host: '0.0.0.0' });
  console.log('Server running on http://localhost:3001');
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});

