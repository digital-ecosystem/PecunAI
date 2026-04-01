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

    // Find admin by email in database
    const admin = await prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Ungültige Anmeldedaten' },
        { status: 401 }
      );
    }

    // Check if admin is active
    if (!admin.isActive) {
      return NextResponse.json(
        { success: false, message: 'Ihr Konto ist deaktiviert' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Ungültige Anmeldedaten' },
        { status: 401 }
      );
    }

    // Create session
    const session = {
      userId: admin.id,
      role: 'admin',
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
    };
    const sessionString = Buffer.from(JSON.stringify(session)).toString('base64');

    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
      },
    });

    response.cookies.set('admin_session', sessionString, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, message: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}