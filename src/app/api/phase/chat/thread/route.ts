// app/api/thread/route.ts

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { qaSessionId } = await req.json()

    if (!qaSessionId) {
      return NextResponse.json({ message: 'qaSessionId is required' }, { status: 400 })
    }

    // Check if session already exists
    const existingSession = await prisma.thread.findUnique({
      where: { qaSessionId: qaSessionId }
    })

    if (existingSession) {
      return NextResponse.json({
        message: 'Session already exists',
        session: existingSession,
        success: true
      }, { status: 200 })
    }

    // Create new session
    const newSession = await prisma.thread.create({
      data: {
        qaSessionId
      }
    })

    return NextResponse.json({
      message: 'Session created',
      session: newSession,
      success: true
    }, { status: 201 })

  } catch (error) {
    console.error('Error in thread API:', error)
    return NextResponse.json({
      message: 'Internal server error',
      success: false,
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}
