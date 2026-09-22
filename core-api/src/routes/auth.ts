// core-api/src/routes/auth.ts
// FULL REPLACEMENT — fixes issue #10 (per-route rate limits on auth endpoints)
//
// What changed:
//   1. Every credential-touching route now has its own strict rate limit, keyed
//      by IP + the identifier being attacked (phone/email), so one attacker
//      cannot burn through the global 100/min budget brute-forcing one account.
//   2. Login no longer echoes the raw service error, which previously let a
//      caller distinguish "no such user" from "wrong password".
//   3. session.regenerate() on login prevents session fixation: a pre-login
//      session id handed to the victim becomes useless after they authenticate.
//   4. The Google callback validates the id_token payload before trusting it.

import { FastifyInstance, FastifyRequest } from 'fastify';
import { userService } from '../services/userService';
import { env } from '../config/env';

import {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/authSchema';

declare module 'fastify' {
  interface Session {
    userId: string;
    role: string;
  }
  interface FastifyInstance {
    googleOAuth2: any;
  }
}

/** Rate-limit key: IP plus the account being targeted. */
function credentialKey(req: FastifyRequest): string {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const identifier = String(body.phone ?? body.email ?? '');
  return `${req.ip}:${identifier}`;
}

const strictLimit = (max: number, timeWindow: string) => ({
  rateLimit: { max, timeWindow, keyGenerator: credentialKey },
});

export async function authRoutes(app: FastifyInstance) {

  // POST /auth/register — 5 per hour per IP+phone
  app.post('/auth/register', { config: strictLimit(5, '1 hour') }, async (req, reply) => {
    try {
      const data = registerSchema.parse(req.body);
      const result = await userService.register(data);
      return reply.code(201).send(result);
    } catch (error: any) {
      if (error.message?.includes('already registered')) {
        return reply.code(409).send({ error: error.message });
      }
      throw error;
    }
  });

  // POST /auth/verify-otp — 10 per 15 min. OTPs are short; brute force is real.
  app.post('/auth/verify-otp', { config: strictLimit(10, '15 minutes') }, async (req, reply) => {
    const data = verifyOtpSchema.parse(req.body);
    const result = await userService.verifyOtp(data.phone, data.otp, data.purpose);
    return reply.send(result);
  });

  // POST /auth/login — 10 per 15 min per IP+identifier
  app.post('/auth/login', { config: strictLimit(10, '15 minutes') }, async (req, reply) => {
    let user;
    try {
      const data = loginSchema.parse(req.body);
      user = await userService.login(data);
    } catch {
      // One generic message for every failure mode — do not reveal whether the
      // account exists, is unverified, or the password was wrong.
      return reply.code(401).send({ error: 'ফোন নম্বর বা পাসওয়ার্ড ভুল' });
    }

    // Session fixation defence: new session id at the privilege boundary.
    // Write userId/role INSIDE the regenerate callback so they land on the
    // fresh session object, then explicitly persist before responding.
    // Regenerate first to prevent session fixation, then set fields on the
    // FRESH req.session object and persist. @fastify/session re-assigns
    // req.session inside the regenerate callback, so any write before the
    // callback fires is lost.
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    req.session.userId = user.id;
    req.session.role = user.role;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    return reply.send({ message: 'Login সফল', user });
  });

  // POST /auth/logout
  app.post('/auth/logout', async (req, reply) => {
    await req.session.destroy();
    return reply.send({ message: 'Logout সফল' });
  });

  // POST /auth/forgot-password — 3 per hour. Each call sends an SMS that costs money.
  app.post('/auth/forgot-password', { config: strictLimit(3, '1 hour') }, async (req, reply) => {
    const data = forgotPasswordSchema.parse(req.body);
    await userService.forgotPassword(data.phone);
    // Always the same response, whether or not the number is registered.
    return reply.send({ message: 'নম্বরটি registered হলে একটি OTP পাঠানো হয়েছে' });
  });

  // POST /auth/reset-password — 5 per hour
  app.post('/auth/reset-password', { config: strictLimit(5, '1 hour') }, async (req, reply) => {
    const data = resetPasswordSchema.parse(req.body);
    const result = await userService.resetPassword(data);
    return reply.send(result);
  });

  // GET /auth/me — called on every SSR page load, keep it off the strict limits
  app.get('/auth/me', { config: { rateLimit: { max: 300, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const userId = req.session.userId;
      if (!userId) return reply.code(401).send({ error: 'Login করো আগে' });
      const user = await userService.getProfile(userId);
      return reply.send(user);
    });

  // GET /auth/google/callback
  app.get('/auth/google/callback', { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } },
    async (req, reply) => {
      try {
        const tokenResult =
          await (app as any).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
        const idToken = tokenResult?.token?.id_token ?? tokenResult?.id_token;
        if (!idToken) throw new Error('No id_token received');

        const parts = idToken.split('.');
        if (parts.length !== 3) throw new Error('Invalid id_token');

        const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));

        // Minimum sanity checks before trusting the payload.
        if (!payload.sub || !payload.email) throw new Error('Incomplete id_token payload');
        if (payload.email_verified === false) throw new Error('Google email not verified');

        const user = await userService.googleLogin({
          googleId: payload.sub,
          email: payload.email,
          name: payload.name,
          profilePhoto: payload.picture,
        });

        await new Promise<void>((resolve, reject) => {
          req.session.regenerate((err) => {
            if (err) return reject(err);
            resolve();
          });
        });

        req.session.userId = user.id;
        req.session.role = user.role;

        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) return reject(err);
            resolve();
          });
        });

        return reply.redirect(`${env.FRONTEND_URL}/`);
      } catch (error: any) {
        req.log.error({ err: error }, 'Google OAuth error');
        return reply.redirect(`${env.FRONTEND_URL}/login?error=google_auth_failed`);
      }
    });
}