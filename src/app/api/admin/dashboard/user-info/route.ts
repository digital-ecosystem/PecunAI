import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const cookie = (await cookies()).get('admin_session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId || session?.role !== 'admin') {
        return NextResponse.json({ message: 'Nicht authentifiziert' }, { status: 401 });
    }

    if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Fehlende Sitzungs-ID' }, { status: 400 });
    }


    try {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: { user: true },
        });

        if (!session || !session.user) {
            return NextResponse.json({ success: false, error: 'Benutzer nicht gefunden' }, { status: 404 });
        }

        const { id, email, createdAt } = session.user;

        return NextResponse.json({
            success: true,
            user: { id, email, createdAt }
        });
    } catch (error) {
        console.error('[GET /api/user]', error);
        return NextResponse.json({ success: false, error: 'Serverfehler' }, { status: 500 });
    }
}
