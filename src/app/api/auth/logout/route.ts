import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (token) {
      // Delete session from database
      // await prisma.session.deleteMany({
      //   where: { token }
      // });
    }

    // Clear cookie using NextResponse
    const response = NextResponse.json({
      message: 'Erfolgreich abgemeldet',
      success: true
    });
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
      sameSite: 'strict',
    });
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ 
      message: 'Abmeldung fehlgeschlagen',
      success: false 
    }, { status: 500 });
  }
}