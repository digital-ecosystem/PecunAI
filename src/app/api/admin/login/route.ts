import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const normalizedEmail = email?.toLowerCase();

  // Replace with your real admin check
  if (normalizedEmail === process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase() && password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    const session = { userId: 'admin-id', role: 'admin', email: process.env.NEXT_PUBLIC_ADMIN_EMAIL };
    const sessionString = Buffer.from(JSON.stringify(session)).toString('base64');

    const response = NextResponse.json({ success: true });
    response.cookies.set('session', sessionString, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  }

  return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
}