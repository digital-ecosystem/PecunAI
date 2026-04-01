// src/app/api/admin/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}