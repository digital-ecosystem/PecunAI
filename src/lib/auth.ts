import { prisma } from './prisma';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
// import { CustomError } from './customError';
// import { create } from 'domain';
// import { string } from 'zod';

/**
 * Helper to extract client IP from request (for IP-based throttling)
 */
export function getClientIP(req?: Request | null): string {
  if (!req) return 'unknown'
  try {
    const forwardedFor = req.headers.get('x-forwarded-for')
    if (forwardedFor) return forwardedFor.split(',')[0].trim()
    const clientIP = req.headers.get('x-client-ip')
    if (clientIP) return clientIP
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export class AuthService {
  static generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  static async createOrUpdateUser(email: string, name = null) {
    const normalizedEmail = email.toLowerCase();
    return await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        updatedAt: new Date(),
        isActive: true
      },
      create: {
        email: normalizedEmail,
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
    const now = new Date()
    const normalizedEmail = email.toLowerCase()

    const LIMIT = parseInt(process.env.OTP_RESEND_LIMIT || '3', 10)
    const WINDOW_MINUTES = parseInt(process.env.OTP_WINDOW_MINUTES || '5', 10)
    const windowMs = WINDOW_MINUTES * 60 * 1000

    const existingOTP = await prisma.oTP.findUnique({ where: { email: normalizedEmail } })

    // If there is an existing blockedUntil and it's still in the future, return that row (caller will handle)
    if (existingOTP?.blockedUntil && existingOTP.blockedUntil > now) {
      return existingOTP
    }

    // Determine window start using resendWindowStart (explicit field)
    let windowStart = existingOTP?.resendWindowStart ?? now
    let resendCount = existingOTP?.resendCount ?? 0
    console.log("🚀 ~ AuthService ~ createOTP ~ resendCount:", resendCount)

    // If window has passed, reset counter and windowStart
    if (now.getTime() - windowStart.getTime() > windowMs) {
      resendCount = 0
      windowStart = now
    }

    // If user already reached limit within window, set blockedUntil and return
    if (resendCount >= LIMIT) {
      const blockedUntil = new Date(now.getTime() + windowMs)
      // update record to reflect block
      const blockedRow = await prisma.oTP.update({
        where: { email: normalizedEmail },
        data: {
          code: 'BLOCKED',
          expiresAt: blockedUntil,
          used: true,
          resendCount,
          blockedUntil,
          resendWindowStart: windowStart,
        }
      })
      return blockedRow
    }

    // Generate new OTP
    const code = this.generateOTP()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    if (existingOTP) {
      // update existing row: increment resendCount and update code/expires
      const updated = await prisma.oTP.update({
        where: { email: normalizedEmail },
        data: {
          code,
          expiresAt,
          used: false,
          attempts: 0,
          resendCount: resendCount + 1,
          blockedUntil: null,
          resendWindowStart: windowStart,
        }
      })
      return updated
    }

    // Create new OTP row
    const created = await prisma.oTP.create({
      data: {
        email: normalizedEmail,
        code,
        expiresAt,
        used: false,
        attempts: 0,
        resendCount: 1,
        blockedUntil: null,
        resendWindowStart: now,
      }
    })
    return created
  }

  static async verifyOTP(email: string, code: string) {
    const normalizedEmail = email.toLowerCase();
    const otp = await prisma.oTP.findFirst({
      where: {
        email: normalizedEmail,
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
          email: normalizedEmail,
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