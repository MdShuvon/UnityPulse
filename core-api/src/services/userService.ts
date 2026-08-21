import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { hashPassword, comparePassword } from '../plugins/bcrypt';
import crypto from 'crypto';

export class UserService {

  // ── REGISTER ─────────────────────────────────
  async register(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) {
    // Email বা phone already আছে কিনা check
    const exists = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { phone: data.phone }] },
    });
    if (exists) throw new Error('Email বা phone already registered');

    // Password hash করো
    const hashed = await hashPassword(data.password);

    // User create করো (isVerified = false)
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: hashed,
        isVerified: false,
      },
    });

    // OTP পাঠাও
    await this.sendOtp(data.phone, 'register');

    return { message: 'OTP পাঠানো হয়েছে', userId: user.id };
  }

  // ── SEND OTP ─────────────────────────────────
  async sendOtp(phone: string, purpose: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otpVerification.deleteMany({
      where: { phone, purpose, used: false },
    });

    await prisma.otpVerification.create({
      data: { phone, otp: hashedOtp, purpose, expiresAt },
    });

    // Send OTP via Email
    // try {
    //   const user = await prisma.user.findUnique({ where: { phone } });
    //   if (user?.email) {
    //     const { sendOTPEmail } = await import('../lib/email');
    //     await sendOTPEmail(user.email, otp, purpose);
    //     console.log(`✅ OTP sent to email: ${user.email}`);
    //   }
    // } catch (emailError) {
    //   console.warn('⚠️ Email send failed, but OTP is:', otp);
    //   console.warn('Email error:', emailError);
    // }
    
    try {
      // Development: Always send to verified email
      const { sendOTPEmail } = await import('../lib/email');
      const devEmail = 'mohammadshuvonss@gmail.com'; // আপনার verified email
      await sendOTPEmail(devEmail, otp, purpose);
      console.log(`✅ OTP sent to: ${devEmail}`);
      console.log(`📱 Registered phone: ${phone}`);
    } catch (emailError) {
      console.warn('⚠️ Email send failed, but OTP is:', otp);
      console.warn('Email error:', emailError);
    }

    // Fallback: Console output for development
    console.log('========================================');
    console.log(`📱 OTP: ${otp} (for ${phone})`);
    console.log('========================================');

    return otp;
  }

  // ── VERIFY OTP ───────────────────────────────
  async verifyOtp(phone: string, otp: string, purpose: string) {
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const record = await prisma.otpVerification.findFirst({
      where: {
        phone,
        otp: hashedOtp,
        purpose,
        used: false,
        expiresAt: { gt: new Date() }, // expire হয়নি
      },
    });

    if (!record) throw new Error('OTP ভুল অথবা মেয়াদ শেষ');

    // OTP use করা হয়ে গেছে mark করো
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { used: true },
    });

    // User verified করো
    if (purpose === 'register') {
      await prisma.user.update({
        where: { phone },
        data: { isVerified: true },
      });
    }

    return { message: 'OTP verified' };
  }

  // ── LOGIN ─────────────────────────────────────
  async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) throw new Error('এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি');
    if (!user.isVerified) throw new Error('আপনার ফোন ভেরিফাই করা হয়নি। আগে OTP ভেরিফাই করুন।');

    const match = await comparePassword(data.password, user.password);
    if (!match) throw new Error('পাসওয়ার্ড ভুল হয়েছে');

    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  // ── FORGOT PASSWORD ──────────────────────────
  async forgotPassword(phone: string) {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) throw new Error('এই phone দিয়ে কোনো account নেই');

    await this.sendOtp(phone, 'reset');
    return { message: 'OTP পাঠানো হয়েছে' };
  }

  // ── RESET PASSWORD ───────────────────────────
  async resetPassword(data: {
    phone: string;
    otp: string;
    newPassword: string;
  }) {
    await this.verifyOtp(data.phone, data.otp, 'reset');

    const hashed = await hashPassword(data.newPassword);
    await prisma.user.update({
      where: { phone: data.phone },
      data: { password: hashed },
    });

    return { message: 'Password বদলানো হয়েছে' };
  }

  // ── GET PROFILE ──────────────────────────────
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, bio: true, profilePhoto: true,
        dateOfBirth: true, gender: true, address: true,
        occupation: true, privacySettings: true,
        isVerified: true, createdAt: true,
      },
    });
    if (!user) throw new Error('User পাওয়া যায়নি');
    return user;
  }
}

export const userService = new UserService();