import { FastifyInstance, FastifyRequest } from 'fastify';
import { userService } from '../services/userService';

import {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/authSchema';

// ✅ Session type declare করা
declare module 'fastify' {
  interface Session {
    userId: string;
    role: string;
  }
  interface FastifyInstance {
    googleOAuth2: any;
  }
}

export async function authRoutes(app: FastifyInstance) {

  // POST /auth/register
  app.post('/auth/register', async (req, reply) => {
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
  // POST /auth/verify-otp
  app.post('/auth/verify-otp', async (req, reply) => {
    const data = verifyOtpSchema.parse(req.body);
    const result = await userService.verifyOtp(
      data.phone, data.otp, data.purpose
    );
    return reply.send(result);
  });

  // POST /auth/login
  app.post('/auth/login', async (req, reply) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await userService.login(data);
      req.session.userId = user.id;
      req.session.role = user.role;
      return reply.send({ message: 'Login সফল', user });
    } catch (error: any) {
      return reply.code(401).send({ error: error.message });
    }
  });

  // POST /auth/logout
  app.post('/auth/logout', async (req, reply) => {
    await req.session.destroy();
    return reply.send({ message: 'Logout সফল' });
  });

  // POST /auth/forgot-password
  app.post('/auth/forgot-password', async (req, reply) => {
    const data = forgotPasswordSchema.parse(req.body);
    const result = await userService.forgotPassword(data.phone);
    return reply.send(result);
  });

  // POST /auth/reset-password
  app.post('/auth/reset-password', async (req, reply) => {
    const data = resetPasswordSchema.parse(req.body);
    const result = await userService.resetPassword(data);
    return reply.send(result);
  });

  // GET /auth/me
  app.get('/auth/me', async (req, reply) => {
    const userId = req.session.userId;
    if (!userId) return reply.code(401).send({ error: 'Login করো আগে' });
    const user = await userService.getProfile(userId);
    return reply.send(user);
  });


  // GET /auth/google/callback — Google OAuth callback
  app.get('/auth/google/callback', async (req, reply) => {
    try {
      const tokenResult = await (app as any).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
      const idToken = tokenResult?.token?.id_token || tokenResult?.id_token;

      if (!idToken) {
        throw new Error('No id_token received');
      }

      const parts = idToken.split('.');
      if (parts.length !== 3) throw new Error('Invalid id_token');

      const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));

      const user = await userService.googleLogin({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        profilePhoto: payload.picture,
      });
      
      // Set session
      req.session.userId = user.id;
      req.session.role = user.role;
      
      // Redirect to frontend dashboard
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return reply.redirect(`${frontendUrl}/dashboard`);
      
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return reply.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  });
}

