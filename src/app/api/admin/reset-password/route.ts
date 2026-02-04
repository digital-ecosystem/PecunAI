import { NextResponse } from 'next/server';
import { prisma, PasswordResetUserType } from '@/lib/prisma';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Token und neues Passwort sind erforderlich' },
        { status: 400 }
      );
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Das Passwort muss mindestens 8 Zeichen lang sein' },
        { status: 400 }
      );
    }

    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        token: token.trim(),
        userType: PasswordResetUserType.ADMIN,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { success: false, message: 'Ungültiger oder abgelaufener Link. Bitte fordern Sie einen neuen Link an.' },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { email: resetRecord.email },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Konto nicht gefunden' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.$transaction([
      prisma.admin.update({
        where: { id: admin.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Ihr Passwort wurde erfolgreich geändert. Sie können sich jetzt anmelden.',
    });
  } catch (error) {
    console.error('Admin reset-password error:', error);
    return NextResponse.json(
      { success: false, message: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
