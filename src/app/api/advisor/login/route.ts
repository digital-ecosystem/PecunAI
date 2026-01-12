import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // Find partner by email
    const partner = await prisma.partner.findUnique({
      where: { email: normalizedEmail },
    });

    if (!partner) {
      return NextResponse.json(
        { success: false, message: 'Ungültige Anmeldedaten' },
        { status: 401 }
      );
    }

    // Check if partner is active
    if (!partner.isActive) {
      return NextResponse.json(
        { success: false, message: 'Ihr Konto ist deaktiviert' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, partner.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Ungültige Anmeldedaten' },
        { status: 401 }
      );
    }

    // Create session
    const session = {
      userId: partner.id,
      role: 'partner',
      email: partner.email,
      firstName: partner.firstName,
      lastName: partner.lastName,
      referralCode: partner.referralCode,
    };

    const sessionString = Buffer.from(JSON.stringify(session)).toString('base64');

    const response = NextResponse.json({
      success: true,
      partner: {
        id: partner.id,
        firstName: partner.firstName,
        lastName: partner.lastName,
        email: partner.email,
        referralCode: partner.referralCode,
      },
    });

    response.cookies.set('advisor_session', sessionString, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('Partner login error:', error);
    return NextResponse.json(
      { success: false, message: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}

