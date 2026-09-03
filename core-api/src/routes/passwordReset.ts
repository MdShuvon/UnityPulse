import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { randomBytes } from 'crypto';
import { sendOTPEmail } from '../lib/email';
import bcrypt from 'bcrypt';

export async function passwordResetRoutes(app: FastifyInstance) {
  
  // ✅ Change: '/auth/forgot-password' → '/auth/email-forgot-password'
  app.post('/auth/email-forgot-password', async (req, reply) => {
    const { email } = req.body as { email: string };

    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
      });

      if (!user) {
        return reply.send({ 
          success: true, 
          message: 'যদি email registered থাকে, OTP পাঠানো হয়েছে।' 
        });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      const otpKey = `password-reset:${user.id}`;
      await redis.set(otpKey, otp, 'EX', 300);

      const attemptKey = `password-reset-attempts:${user.id}`;
      await redis.set(attemptKey, '0', 'EX', 300);

      await sendOTPEmail(user.email, otp, 'reset');

      return reply.send({ 
        success: true, 
        message: 'OTP পাঠানো হয়েছে। আপনার email check করুন।' 
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      return reply.code(500).send({ 
        success: false, 
        message: 'Server error. আবার চেষ্টা করুন।' 
      });
    }
  });

  // ✅ Change: '/auth/verify-reset-otp' → '/auth/verify-email-otp'
  app.post('/auth/verify-email-otp', async (req, reply) => {
    const { email, otp } = req.body as { email: string; otp: string };

    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
      });

      if (!user) {
        return reply.code(400).send({ 
          success: false, 
          message: 'User পাওয়া যায়নি।' 
        });
      }

      const storedOtp = await redis.get(`password-reset:${user.id}`);
      
      if (!storedOtp) {
        return reply.code(400).send({ 
          success: false, 
          message: 'OTP expired। আবার request করুন।' 
        });
      }

      const attempts = parseInt(await redis.get(`password-reset-attempts:${user.id}`) || '0');
      
      if (attempts >= 5) {
        await redis.del(`password-reset:${user.id}`);
        await redis.del(`password-reset-attempts:${user.id}`);
        return reply.code(400).send({ 
          success: false, 
          message: 'অনেক বেশি ভুল attempt। আবার request করুন।' 
        });
      }

      if (storedOtp !== otp.trim()) {
        await redis.incr(`password-reset-attempts:${user.id}`);
        return reply.code(400).send({ 
          success: false, 
          message: 'ভুল OTP। আবার চেষ্টা করুন।' 
        });
      }

      const resetToken = randomBytes(32).toString('hex');
      const tokenKey = `password-reset-token:${user.id}`;
      await redis.set(tokenKey, resetToken, 'EX', 900);
      
      await redis.del(`password-reset:${user.id}`);
      await redis.del(`password-reset-attempts:${user.id}`);

      return reply.send({ 
        success: true, 
        message: 'OTP সঠিক। এখন নতুন password set করুন।',
        resetToken,
        userId: user.id
      });

    } catch (error) {
      console.error('Verify OTP error:', error);
      return reply.code(500).send({ 
        success: false, 
        message: 'Server error। আবার চেষ্টা করুন।' 
      });
    }
  });

  // ✅ Change: '/auth/reset-password' → '/auth/reset-password-email'
  app.post('/auth/reset-password-email', async (req, reply) => {
    const { userId, resetToken, newPassword } = req.body as { 
      userId: string; 
      resetToken: string; 
      newPassword: string; 
    };

    try {
      if (!newPassword || newPassword.length < 8) {
        return reply.code(400).send({ 
          success: false, 
          message: 'Password কমপক্ষে ৮ অক্ষর হতে হবে।' 
        });
      }

      const storedToken = await redis.get(`password-reset-token:${userId}`);
      
      if (!storedToken || storedToken !== resetToken) {
        return reply.code(400).send({ 
          success: false, 
          message: 'Reset token invalid বা expired। আবার request করুন।' 
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      await redis.del(`password-reset-token:${userId}`);

      return reply.send({ 
        success: true, 
        message: 'Password সফলভাবে reset হয়েছে। এখন login করুন।' 
      });

    } catch (error) {
      console.error('Reset password error:', error);
      return reply.code(500).send({ 
        success: false, 
        message: 'Server error। আবার চেষ্টা করুন।' 
      });
    }
  });
}