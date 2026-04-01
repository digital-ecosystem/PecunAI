import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, message: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Decode session
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    );

    if (sessionData.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: sessionData.userId,
        email: sessionData.email,
        firstName: sessionData.firstName,
        lastName: sessionData.lastName,
      },
    });
  } catch (error) {
    console.error('Get admin data error:', error);
    return NextResponse.json(
      { success: false, message: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
