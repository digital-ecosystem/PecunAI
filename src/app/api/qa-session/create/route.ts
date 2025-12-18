// app/api/qa-session/create/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Benutzer-ID ist erforderlich' }, { status: 400 });
    }

    // Check for referral code in cookies
    const cookieStore = await cookies();
    const referralCode = cookieStore.get('referral_code')?.value;
    
    let partnerId: string | null = null;

    // If referral code exists, find the partner
    if (referralCode) {
      const partner = await prisma.partner.findUnique({
        where: { referralCode: referralCode },
        select: { id: true, isActive: true },
      });

      // Only assign if partner exists and is active
      if (partner && partner.isActive) {
        partnerId = partner.id;
      }
    }

    const newSession = await prisma.qASession.create({
      data: {
        userId: userId,
        status: 'DRAFT',
        phase: 'TERMS1',
        // Link to partner if referral code was valid
        partnerId: partnerId,
        referralCode: partnerId ? referralCode : null, // Store code for historical tracking
      },
    });

    // Create response
    const response = NextResponse.json({ 
      success: true, 
      session: newSession,
      referredBy: partnerId ? referralCode : null,
    }, { status: 201 });

    // Clear the referral cookie after it's been used (so future sessions aren't auto-assigned)
    if (referralCode) {
      response.cookies.set('referral_code', '', {
        path: '/',
        maxAge: 0, // Delete the cookie
      });
    }

    return response;
  } catch (error) {
    console.error('Failed to create QASession:', error);
    return NextResponse.json({ success: false, error: 'Interner Serverfehler' }, { status: 500 });
  }
}
