import { prisma } from './prisma';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { CustomError } from './customError';

export class AuthService {
  static generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  static async createOrUpdateUser(email: string, name = null) {
    return await prisma.user.upsert({
      where: { email },
      update: {
        updatedAt: new Date(),
        isActive: true
      },
      create: {
        email,
        name,
        isActive: true
      },
    });
  }

  // static async createOTP(email: string) {
  //   // Clean up expired OTPs for this email
  //   await prisma.oTP.deleteMany({
  //     where: {
  //       email,
  //       OR: [
  //         { expiresAt: { lt: new Date() } },
  //         { used: true }
  //       ]
  //     }
  //   });

  //   // Generate new OTP
  //   const code = this.generateOTP();
  //   const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  //   const otp = await prisma.oTP.create({
  //     data: {
  //       email,
  //       code,
  //       expiresAt,
  //       attempts: 0,
  //       used: false
  //     }
  //   });

  //   return otp;
  // }

  static async createOTP(email: string) {
    const now = new Date();

    const existingOTP = await prisma.oTP.findUnique({ where: { email } });
    console.log("🚀 ~ AuthService ~ createOTP ~ existingOTP:", existingOTP)

    // ✅ If user is blocked, but block has expired → reset the fields
    if (existingOTP?.blockedUntil && existingOTP.blockedUntil <= now) {
      existingOTP.resendCount = 0;
      existingOTP.blockedUntil = null;
    }

    // ❌ If still blocked
    /*if (existingOTP?.blockedUntil && existingOTP.blockedUntil > now) {
      throw new CustomError('Too many OTP requests. Try again after 5 minutes.', 429);
    }*/

    const resendCount = existingOTP?.resendCount ?? 0;
    console.log("🚀 ~ AuthService ~ createOTP ~ resendCount:", resendCount)

    //TODO: the logic of the block of the user is wrong, it should block the user if resend the email fife times wihtin five minutes
    // 🚫 If resend limit reached, block
    /*if (resendCount >= 3) {
      const blockedUntil = new Date(Date.now() + 5 * 60 * 1000);

      return await prisma.oTP.upsert({
        where: { email },
        update: {
          code: 'BLOCKED',
          expiresAt: blockedUntil,
          used: true,
          resendCount,
          blockedUntil,
          createdAt: now,
        },
        create: {
          email,
          code: 'BLOCKED',
          expiresAt: blockedUntil,
          used: true,
          resendCount,
          blockedUntil,
          createdAt: now,
        },
      });
    }*/

    // ✅ Generate new OTP
    const code = this.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    return await prisma.oTP.upsert({
      where: { email },
      update: {
        code,
        expiresAt,
        used: false,
        attempts: 0,
        resendCount: resendCount + 1,
        blockedUntil: null,
        createdAt: now,
      },
      create: {
        email,
        code,
        expiresAt,
        used: false,
        attempts: 0,
        resendCount: 1,
        blockedUntil: null,
        createdAt: now,
      },
    });
  }

  static async verifyOTP(email: string, code: string) {
    const otp = await prisma.oTP.findFirst({
      where: {
        email,
        code,
        used: false,
        // expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otp) {
      // Check if there's an OTP for this email to increment attempts
      const existingOTP = await prisma.oTP.findFirst({
        where: {
          email,
          used: false,
          expiresAt: { gt: new Date() }
        }
      });

      if (existingOTP) {
        await prisma.oTP.update({
          where: { id: existingOTP.id },
          data: { attempts: { increment: 1 } }
        });

        // Delete OTP if too many attempts
        if (existingOTP.attempts >= 2) { // 3 total attempts
          await prisma.oTP.delete({
            where: { id: existingOTP.id }
          });
        }
      }

      return { success: false, message: 'Invalid or expired OTP' };
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { used: true }
    });

    return { success: true, otp };
  }

  static async createSession(userId: string) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await prisma.session.create({
      data: {
        userId,
        token,
        expiresAt
      }
    });

    return { token, sessionId: session.id };
  }

  // static async cleanupExpiredSessions() {
  //   await prisma.session.deleteMany({
  //     where: {
  //       expiresAt: { lt: new Date() }
  //     }
  //   });
  // }

  static async getUserFromToken(token: string) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    try {
      jwt.verify(token, process.env.JWT_SECRET as string);

      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!session || !session.expiresAt || session.expiresAt < new Date()) {
        return null;
      }

      return { ...session.user };
    } catch (error) {
      console.log("🚀 ~ AuthService ~ getUserFromToken ~ error:", error)
      return null;
    }
  }

  static async findDraftSessionByEmail(email: string) {
    return prisma.session.findFirst({
      where: {
        user: { email },
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}