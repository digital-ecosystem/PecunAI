import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get('code') ?? '').trim();

    if (!code) {
      return NextResponse.json(
        { success: false, message: 'Partner-Code fehlt' },
        { status: 400 }
      );
    }

    const partner = await prisma.partner.findUnique({
      where: { referralCode: code },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        referralCode: true,
        isActive: true,
      },
    });

    if (!partner || !partner.isActive) {
      return NextResponse.json(
        { success: false, message: 'Ungültiger oder inaktiver Partner-Code' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      partner: {
        id: partner.id,
        firstName: partner.firstName,
        lastName: partner.lastName,
        email: partner.email,
        referralCode: partner.referralCode,
      },
    });
  } catch (error) {
    console.error('Partner lookup error:', error);
    return NextResponse.json(
      { success: false, message: 'Partner konnte nicht abgerufen werden' },
      { status: 500 }
    );
  }
}
