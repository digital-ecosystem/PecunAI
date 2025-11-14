import { AuthService } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, otp } = body;

  if (!email || !otp) {
    return NextResponse.json({ message: 'Email and OTP are required' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase();

  try {
    // Verify OTP
    const result = await AuthService.verifyOTP(normalizedEmail, otp);

    if (!result.success) {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }

    // Get user
    const user = await AuthService.createOrUpdateUser(normalizedEmail);

    // Create session
    const {token, sessionId} = await AuthService.createSession(user.id);

    // Clean up expired sessions
    // await AuthService.cleanupExpiredSessions();

    // Set HTTP-only cookie using NextResponse
    const response = NextResponse.json({
      message: 'Authentication successful',
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });
    response.cookies.set('session-id', sessionId, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ 
      message: 'Failed to verify OTP',
      success: false 
    }, { status: 500 });
  }
}