import { AuthService } from "@/lib/auth";
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    const sessionId = cookieStore.get('session-id')?.value;
    
    if (!token) {
      return NextResponse.json({ message: 'Nicht authentifiziert' }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(token);
    
    if (!user) {
      return NextResponse.json({ message: 'Ungültiges Token' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        // age: user.age,
        createdAt: user.createdAt,
        sessionId: sessionId // Assuming sessionStatus is part of the user object
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ 
      message: 'Benutzer konnte nicht abgerufen werden',
      success: false 
    }, { status: 500 });
  }
}