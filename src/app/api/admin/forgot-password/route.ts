import { NextResponse } from 'next/server';
import { prisma, PasswordResetUserType } from '@/lib/prisma';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

const TOKEN_EXPIRY_HOURS = 1;

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'E-Mail ist erforderlich' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const admin = await prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return same message to avoid email enumeration
    if (!admin) {
      return NextResponse.json({
        success: true,
        message: 'Admin Konto wurde nicht gefunden.',
      });
    }

    // Invalidate any existing reset tokens for this admin
    await prisma.passwordResetToken.deleteMany({
      where: {
        email: normalizedEmail,
        userType: PasswordResetUserType.ADMIN,
      },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        token,
        email: normalizedEmail,
        userType: PasswordResetUserType.ADMIN,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/admin/reset-password?token=${encodeURIComponent(token)}`;

    await sendPasswordResetEmail({
      to: normalizedEmail,
      resetUrl,
      recipientName: admin.firstName ? `${admin.firstName} ${admin.lastName}` : null,
      expiresInMinutes: TOKEN_EXPIRY_HOURS * 60,
      portalName: 'Admin',
    });

    return NextResponse.json({
      success: true,
      message: 'Link zum Zurücksetzen des Passworts wurde gesendet.',
    });
  } catch (error) {
    console.error('Admin forgot-password error:', error);
    return NextResponse.json(
      { success: false, message: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
