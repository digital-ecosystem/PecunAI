import { AuthService } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { CustomError } from '@/lib/customError';
import { sendOtpEmail } from '@/lib/email';
// import { SessionStatus } from '@/types';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, name } = body;

  if (!email || !email.includes('@')) {
    return NextResponse.json({ message: 'Eine gültige E-Mail-Adresse ist erforderlich.' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase();

  try {
    // Create or update user
    await AuthService.createOrUpdateUser(normalizedEmail, name);

    // Step 2: Check for existing DRAFT session
    // const existingDraftSession = await AuthService.findDraftSessionByEmail(email);
    // const isExpired = existingDraftSession ? new Date(existingDraftSession.expiresAt) < new Date() : true;
    // if (existingDraftSession?.status == SessionStatus.DRAFT && !isExpired) {
    //   // Get user
    //   const user = await AuthService.createOrUpdateUser(email);

    //   // Clean up expired sessions
    //   // await AuthService.cleanupExpiredSessions();

    //   // Set HTTP-only cookie using NextResponse
    //   const response = NextResponse.json({
    //     message: 'Authentication successful',
    //     success: true,
    //     user: {
    //       id: user.id,
    //       email: user.email,
    //       name: user.name
    //     }
    //   });
    //   response.cookies.set('auth-token', existingDraftSession.token, {
    //     httpOnly: true,
    //     path: '/',
    //     maxAge: 60 * 60 * 24 * 7, // 7 days
    //     sameSite: 'strict',
    //     secure: process.env.NODE_ENV === 'production',
    //   });
    //   response.cookies.set('session-id', existingDraftSession.id, {
    //     httpOnly: true,
    //     path: '/',
    //     maxAge: 60 * 60 * 24 * 7, // 7 days
    //     sameSite: 'strict',
    //     secure: process.env.NODE_ENV === 'production',
    //   });
    //   return response;
    // } else {
      // Create OTP (this enforces resend limits)
        const otp = await AuthService.createOTP(normalizedEmail);
        // console.log("🚀 ~ POST ~ otp:", otp)

        const LIMIT = parseInt(process.env.OTP_RESEND_LIMIT || '3', 10)
        const WINDOW_MINUTES = parseInt(process.env.OTP_WINDOW_MINUTES || '5', 10)

        // If account is blocked due to too many resends, inform client with remaining cooldown
        if (otp.blockedUntil && new Date(otp.blockedUntil) > new Date()) {
          const msLeft = new Date(otp.blockedUntil).getTime() - Date.now()
          return NextResponse.json({
            message: `Sie haben den Code zu oft angefordert. Versuchen Sie es in ${Math.ceil(msLeft/1000)} Sekunden erneut.`,
            // message: `You've requested the code too many times. Try again in ${Math.ceil(msLeft/1000)} seconds.`,
            success: false,
            blockedUntil: otp.blockedUntil,
            resendCount: otp.resendCount,
            resendLimit: LIMIT,
            windowMinutes: WINDOW_MINUTES
          }, { status: 429 })
        }

        await sendOtpEmail({
          to: normalizedEmail,
          code: otp.code,
          recipientName: name,
          expiresInMinutes: 5,
        });

      return NextResponse.json({
        message: 'OTP erfolgreich gesendet',
        success: true,
        resendCount: otp.resendCount,
        resendLimit: LIMIT,
        windowMinutes: WINDOW_MINUTES
      });
    // }

  } catch (error) {
    console.log("🚀 ~ POST ~ error:", error)
    
    let message = 'OTP konnte nicht gesendet werden';
    let status = 500;

    if (error instanceof CustomError) {
      message = error.message;
      status = error.statusCode;
    } else if (error instanceof Error) {
      message = error.message;
    }

    return NextResponse.json({ message, success: false }, { status });
  }
}