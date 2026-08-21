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
}