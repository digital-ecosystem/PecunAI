// app/api/thread/route.ts

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { qaSessionId } = await req.json()

    if (!qaSessionId) {
      return NextResponse.json({ message: 'qaSessionId is required' }, { status: 400 })
    }

    // Idempotent + race-safe: multiple calls should return the same thread
    const thread = await prisma.thread.upsert({
      where: { qaSessionId },
      update: {},
      create: { qaSessionId },
    })

    return NextResponse.json({
      message: 'Thread ready',
      session: thread,
      success: true
    }, { status: 200 })

  } catch (error) {
    console.error('Error in thread API:', error)
    return NextResponse.json({
      message: 'Internal server error',
      success: false,
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}
