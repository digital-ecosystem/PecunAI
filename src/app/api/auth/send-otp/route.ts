import { AuthService } from '@/lib/auth';
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
import { CustomError } from '@/lib/customError';
// import { SessionStatus } from '@/types';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST || 'relay382.mysmtp2.com',
  port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports (587 uses STARTTLS)
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASSWORD,
  },
});

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

        // Send email
        await transporter.sendMail({
          from: `"4money" <${process.env.EMAIL_FROM || 'office@4money.at'}>`,
          to: normalizedEmail,
          subject: 'Ihr Verifizierungscode für den Onboarding-Prozess',
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">Ihr Verifizierungscode</h1>
              <p style="color: #666; font-size: 16px;">Verwenden Sie diesen Code, um Ihren Onboarding-Prozess zu starten.</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px; margin: 30px 0;">
              <div style="background: white; padding: 20px; border-radius: 8px; display: inline-block;">
                <h2 style="color: #2563eb; font-size: 36px; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp.code}</h2>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #666; margin: 0; font-size: 14px;">
                <strong>⏰ Dieser Code läuft in 5 Minuten ab.</strong><br>
                🔒 Wenn Sie diesen Code nicht angefordert haben, ignorieren Sie bitte diese E-Mail.<br>
                💡 Aus Sicherheitsgründen dürfen Sie diesen Code niemals an andere Personen weitergeben.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px;">
                Diese E-Mail wurde automatisch von einem sicheren, überwachten System gesendet. Bitte antworten Sie nicht auf diese Nachricht.
              </p>
            </div>
          </div>
        `,
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