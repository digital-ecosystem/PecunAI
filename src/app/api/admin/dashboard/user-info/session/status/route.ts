import { prisma } from '@/lib/prisma';
import { SessionStatus } from '@/types';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, status } = body;
    console.log("🚀 ~ PATCH ~ sessionId, status:", sessionId, status)

    // Validate input
    if (!sessionId || !status) {
      return NextResponse.json(
        { success: false, error: 'Sitzungs-ID und Status sind erforderlich' },
        { status: 400 }
      );
    }

    // Validate status value
    if (!Object.values(SessionStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: `Ungültiger Status: ${status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.qASession.update({
      where: { id: sessionId },
      data: { status },
      include: {
        user: true
      }
    });

    // send EMail to user
    const email = updated.user.email;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email, // or wherever you're getting the user's email
      subject: `Ihre QA-Sitzung wurde ${status === 'APPROVED' ? 'GENEHMIGT' : status === 'REJECTED' ? 'ABGELEHNT' : status}`, // e.g. APPROVED, REJECTED, etc.
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">QA-Sitzung ${status === 'APPROVED' ? 'GENEHMIGT' : status === 'REJECTED' ? 'ABGELEHNT' : status}</h1>
            <p style="font-size: 16px; color: #555;">
              Hallo, <br /><br />
              Ihre QA-Sitzung wurde von unserem Admin-Team <strong>${status === 'APPROVED' ? 'GENEHMIGT' : status === 'REJECTED' ? 'ABGELEHNT' : status}</strong>.
            </p>
          </div>

          <div style="background: #f0f4ff; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
            <p style="font-size: 18px; margin: 0; color: #333;">
              <strong>Status:</strong> <span style="color: ${
                status === 'APPROVED'
                  ? '#16a34a'
                  : status === 'REJECTED'
                  ? '#dc2626'
                  : '#2563eb'
              };">${status === 'APPROVED' ? 'GENEHMIGT' : status === 'REJECTED' ? 'ABGELEHNT' : status}</span>
            </p>
            <p style="margin-top: 10px; font-size: 14px; color: #666;">
              QA-Sitzungs-ID: ${updated.id}
            </p>
          </div>

          ${
            status === 'APPROVED'
              ? `<p style="font-size: 14px; color: #555;">✅ Sie können jetzt fortfahren, Ihr endgültiges Dokument im Dashboard herunterzuladen und zu unterschreiben.</p>`
              : status === 'REJECTED'
              ? `<p style="font-size: 14px; color: #555;">⚠️ Bitte überprüfen Sie das Feedback in Ihrem Dashboard und aktualisieren Sie die Informationen, bevor Sie sie erneut einreichen.</p>`
              : `<p style="font-size: 14px; color: #555;">⌛ Ihre Einreichung wird derzeit geprüft. Wir benachrichtigen Sie, sobald sie bearbeitet wurde.</p>`
          }

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_FRONTEND_URL}/customer/dashboard" style="padding: 10px 20px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 6px;">
              Zum Dashboard
            </a>
          </div>

          <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            Dies ist eine automatische Benachrichtigung. Bitte antworten Sie nicht auf diese E-Mail.
          </div>
        </div>
      `,
    });



    return NextResponse.json({
      success: true,
      message: 'Sitzungsstatus erfolgreich aktualisiert',
      session: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('[PATCH /api/session/status]', error);
    return NextResponse.json(
      { success: false, error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
