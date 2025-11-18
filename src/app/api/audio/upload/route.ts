import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioBlob = formData.get('audio') as Blob
    const threadId = formData.get('threadId') as string
    const sessionId = formData.get('sessionId') as string

    if (!audioBlob) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      )
    }

    if (!threadId) {
      return NextResponse.json(
        { error: 'threadId is required' },
        { status: 400 }
      )
    }

    // Convert blob to buffer
    const arrayBuffer = await audioBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Determine base audio directory and per-session folder
    const audioBase = join(process.cwd(), 'public', 'audio')
    const sessionFolder = sessionId && sessionId.length > 0 ? sessionId : (threadId || 'default')
    const audioDir = join(audioBase, sessionFolder)
    if (!existsSync(audioDir)) {
      await mkdir(audioDir, { recursive: true })
    }

    // Compute next message index for this thread (server-authoritative)
    const lastMessage = await prisma.message.findFirst({
      where: { threadId: threadId },
      orderBy: [{ messageIndex: 'desc' }],
      select: { messageIndex: true }
    })
    const nextIndex = lastMessage ? lastMessage.messageIndex + 1 : 0

    // Generate filename using nextIndex and sessionId
    const safeSessionId = sessionFolder.replace(/[^a-zA-Z0-9-_]/g, '_')
    const fileName = `${nextIndex}_${safeSessionId}.webm`
    const filePath = join(audioDir, fileName)

    // Save file to disk
    await writeFile(filePath, buffer)

    // Save audio file record to database
    const audioFile = await prisma.audioFile.create({
      data: {
        fileName,
        filePath: `/audio/${sessionFolder}/${fileName}`,
        mimeType: audioBlob.type || 'audio/webm',
        size: buffer.length,
      }
    })

    // Create placeholder message to reserve the messageIndex
    await prisma.message.create({
      data: {
        threadId: threadId,
        role: 'customer',
        content: '🎤 Audio wird transkribiert...',
        messageIndex: nextIndex,
        audioFileId: audioFile.id,
      }
    })

    return NextResponse.json({
      success: true,
      audioFileId: audioFile.id,
      fileName: audioFile.fileName,
      filePath: audioFile.filePath,
      messageIndex: nextIndex
    })
  } catch (error) {
    console.error('Audio upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload audio file' },
      { status: 500 }
    )
  }
}
