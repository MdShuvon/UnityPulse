// core-api/src/server.ts
// FULL REPLACEMENT — fixes issues #5, #9, #10 and registers the new payment routes (#1)
//
// What changed vs the original:
//   1. config/env.ts is imported FIRST, so a misconfigured environment fails at
//      boot with a readable message instead of running with insecure defaults.
//   2. Session cookie: secret from validated env (no hardcoded fallback),
//      secure + sameSite derived from NODE_ENV, and rolling sessions so an
//      active user is not logged out mid-use.
//   3. Multipart limit reads MAX_UPLOAD_BYTES — the same constant fileService
//      uses, so the two cannot drift apart.
//   4. Rate limiting keeps the 100/min global default but now keys on the
//      session user when present, and auth routes add their own tighter limits.
//   5. The error handler no longer leaks internal messages in production, and
//      Zod validation errors return 400 with field details instead of 500.
//   6. Graceful shutdown closes Fastify, Prisma and both Redis connections.

import { env, MAX_UPLOAD_BYTES, isProduction } from './config/env';
import formbody from '@fastify/formbody';
import fs from 'fs';
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { ZodError } from 'zod';

import { prisma } from './lib/prisma';
import { redis, redisSub, setupRedisListeners } from './lib/redis';
import { ensureBucket } from './lib/minio';

// ── Routes ─────────────────────────────────────────────────────────────────
import { authRoutes } from './routes/auth';
import { profileRoutes } from './routes/profile';
import { orgRoutes } from './routes/organizations';
import { donationRoutes } from './routes/donations';
import { exchangeRateRoutes } from './routes/exchangeRate';
import { searchRoutes } from './routes/search';
import { taskRoutes } from './routes/tasks';
import { causeRoutes } from './routes/causes';
import { adminCauseRoutes } from './routes/admin/causes';
import { leaderboardRoutes } from './routes/leaderboard';
import { postRoutes } from './routes/posts';
import { photoRoutes } from './routes/photos';
import { careerRoutes } from './routes/career';
import { paymentCallbackRoutes } from './routes/paymentCallbacks';
import { homeRoutes } from './routes/home';
import { notificationRoutes } from './routes/notifications';
import { localAdminRoutes } from './routes/localAdmin';
import { passwordResetRoutes } from './routes/passwordReset';

import { adminUserRoutes } from './routes/admin/users';
import { adminDonationRoutes } from './routes/admin/donations';
import { adminKycRoutes } from './routes/admin/kyc';
import { adminTaskRoutes } from './routes/admin/tasks';
import { adminPostRoutes } from './routes/admin/posts';
import { adminCareerRoutes } from './routes/admin/career';
import { superAdminRoutes } from './routes/superAdmin';
import googleOAuthPlugin from './plugins/googleOAuth';


const httpsOptions =
  isProduction && env.HTTPS_CERT_PATH && env.HTTPS_KEY_PATH
    ? { cert: fs.readFileSync(env.HTTPS_CERT_PATH), key: fs.readFileSync(env.HTTPS_KEY_PATH) }
    : undefined;

const app = Fastify({
  logger: isProduction
    ? { level: 'info' }
    : { level: 'debug', transport: { target: 'pino-pretty' } },
  trustProxy: isProduction,
  ...(httpsOptions ? { https: httpsOptions } : {}),
});

async function start() {
  // ── Security ──────────────────────────────────────────────────────────────
  await app.register(helmet, { contentSecurityPolicy: false });

  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  // Global fallback limit. Tighter per-route limits live in routes/auth.ts.
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    // Authenticated users are limited per account, guests per IP.
    keyGenerator: (req) => (req.session as any)?.userId ?? req.ip,
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'অনেক বেশি request — একটু অপেক্ষা করো',
    }),
  });

  // ── File upload — single source of truth for the limit ────────────────────
  await app.register(multipart, {
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
      files: 5,
      fields: 20,
    },
  });

  // ── Form bodies (SSLCommerz callbacks send urlencoded) ───────────────────
  await app.register(formbody);

  // ── Cookie + session ──────────────────────────────────────────────────────
  await app.register(fastifyCookie);

  await app.register(fastifySession, {
    secret: env.SESSION_SECRET, // validated, min 32 chars, required in production
    rolling: true,              // sliding expiry for active users
    cookie: {
      secure: isProduction,     // HTTPS-only in production
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    store: {
      get: async (sid, cb) => {
        try {
          const data = await redis.get(`sess:${sid}`);
          cb(null, data ? JSON.parse(data) : null);
        } catch (err) {
          cb(err as Error);
        }
      },
      set: async (sid, session, cb) => {
        try {
          // @fastify/session's Session instance stores custom fields
          // (userId, role) non-enumerably, so direct access via
          // (session as any).userId returns undefined. Use the Session
          // instance's own toJSON()/data extraction, then merge cookie.
          const sessionData =
            typeof (session as any).toJSON === 'function'
              ? (session as any).toJSON()
              : { ...(session as any) };

          const payload = {
            ...sessionData,
            cookie: session.cookie,
          };

          await redis.set(`sess:${sid}`, JSON.stringify(payload), 'EX', 604800);
          cb(null);
        } catch (err) {
          cb(err as Error);
        }
      },
      destroy: async (sid, cb) => {
        try {
          await redis.del(`sess:${sid}`);
          cb(null);
        } catch (err) {
          cb(err as Error);
        }
      },
    },
  });

  // ── External services ─────────────────────────────────────────────────────
  await ensureBucket();
  await setupRedisListeners();

  // ── Health / readiness ────────────────────────────────────────────────────
  app.get('/health', { config: { rateLimit: false } }, async () => ({
    status: 'ok',
    time: new Date().toISOString(),
  }));

  app.get('/ready', { config: { rateLimit: false } }, async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await redis.ping();
      return { status: 'ready' };
    } catch (err) {
      return reply.code(503).send({ status: 'not-ready' });
    }
  });

  await app.register(googleOAuthPlugin);

  // ── Public + member routes ────────────────────────────────────────────────
  await app.register(authRoutes);
  await app.register(passwordResetRoutes);
  await app.register(profileRoutes);
  await app.register(orgRoutes);
  await app.register(donationRoutes);
  await app.register(exchangeRateRoutes);
  await app.register(taskRoutes);
  await app.register(causeRoutes);
  await app.register(searchRoutes);
  await app.register(leaderboardRoutes);
  await app.register(postRoutes);
  await app.register(photoRoutes);
  await app.register(careerRoutes);
  await app.register(paymentCallbackRoutes); // gateway callbacks — unauthenticated by design
  await app.register(homeRoutes);
  await app.register(notificationRoutes);
  await app.register(localAdminRoutes);

  // ── Admin routes ──────────────────────────────────────────────────────────
  await app.register(adminCauseRoutes);
  await app.register(adminKycRoutes);
  await app.register(adminDonationRoutes);
  await app.register(adminTaskRoutes);
  await app.register(adminPostRoutes);
  await app.register(adminCareerRoutes);
  await app.register(superAdminRoutes);
  await app.register(adminUserRoutes);

  // ── Error handler ─────────────────────────────────────────────────────────
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'Validation failed',
        issues: error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const status = error.statusCode ?? 500;

    if (status >= 500) {
      app.log.error({ err: error, url: req.url }, 'Unhandled error');
      // Do not leak internals to the client in production.
      return reply.code(status).send({
        error: isProduction ? 'Internal server error' : error.message,
      });
    }

    return reply.code(status).send({ error: error.message });
  });

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`Server running on port ${env.PORT} (mode: ${env.NODE_ENV}, payments: ${env.PAYMENT_MODE})`);
}

// ── Graceful shutdown ───────────────────────────────────────────────────────
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    app.log.info(`${signal} received — shutting down`);
    try {
      await app.close();
      await prisma.$disconnect();
      redis.disconnect();
      redisSub.disconnect();
    } finally {
      process.exit(0);
    }
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});