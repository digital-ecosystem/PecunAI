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

    const partner = await prisma.partner.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return same message to avoid email enumeration
    if (!partner) {
      return NextResponse.json({
        success: true,
        message: 'Es existiert kein Konto mit dieser E-Mail.',
      });
    }

    // Invalidate any existing reset tokens for this partner
    await prisma.passwordResetToken.deleteMany({
      where: {
        email: normalizedEmail,
        userType: PasswordResetUserType.PARTNER,
      },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        token,
        email: normalizedEmail,
        userType: PasswordResetUserType.PARTNER,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/advisor/reset-password?token=${encodeURIComponent(token)}`;

    await sendPasswordResetEmail({
      to: normalizedEmail,
      resetUrl,
      recipientName: partner.firstName ? `${partner.firstName} ${partner.lastName}` : null,
      expiresInMinutes: TOKEN_EXPIRY_HOURS * 60,
      portalName: 'Berater Portal',
    });

    return NextResponse.json({
      success: true,
      message: 'Link zum Zurücksetzen des Passworts wurde gesendet.',
    });
  } catch (error) {
    console.error('Advisor forgot-password error:', error);
    return NextResponse.json(
      { success: false, message: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
