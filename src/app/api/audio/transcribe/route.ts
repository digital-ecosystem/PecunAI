import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { createReadStream } from 'fs'
import { join } from 'path'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { audioFileId } = await req.json()

    if (!audioFileId) {
      return NextResponse.json(
        { error: 'audioFileId is required' },
        { status: 400 }
      )
    }

    // Fetch audio file from database
    const audioFile = await prisma.audioFile.findUnique({
      where: { id: audioFileId }
    })

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file not found' },
        { status: 404 }
      )
    }

    // Read file from disk
    const filePath = join(process.cwd(), 'public', audioFile.filePath)
    const fileStream = createReadStream(filePath)

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream as unknown as Parameters<typeof openai.audio.transcriptions.create>[0]['file'],
      model: 'whisper-1',
      language: 'de' // German language
    })

    const transcript = transcription.text

    // Update audio file with transcript
    await prisma.audioFile.update({
      where: { id: audioFileId },
      data: { transcript }
    })

    // Find the message associated with this audio file to get thread context
    const userMessage = await prisma.message.findFirst({
      where: { audioFileId: audioFileId },
      include: { thread: { include: { messages: true } } }
    })

    if (!userMessage) {
      console.warn('No message found for audioFileId:', audioFileId)
      return NextResponse.json({
        success: true,
        transcript,
        audioFileId
      })
    }

    // Update user message with the transcript
    await prisma.message.update({
      where: { id: userMessage.id },
      data: { content: transcript }
    })

    // Get conversation history for AI context
    const allMessages = await prisma.message.findMany({
      where: { threadId: userMessage.threadId },
      orderBy: [{ messageIndex: 'asc' }],
      take: 50 // Limit context to last 50 messages
    })

    // Build conversation input for OpenAI
    const conversationHistory = allMessages
      .filter((msg) => msg.messageIndex < userMessage.messageIndex) // Exclude current and future messages
      .map((msg) => ({
        role: msg.role === 'customer' ? 'user' : 'assistant',
        content: msg.content
      }))

    // Add the current user message
    conversationHistory.push({
      role: 'user',
      content: transcript
    })

    // Call OpenAI to get AI response
    let aiResponse = ''
    try {
      const aiReply = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: conversationHistory as unknown as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: 0.7,
        max_tokens: 1000
      })

      aiResponse = aiReply.choices[0]?.message?.content || 'Entschuldigung, ich konnte keine Antwort generieren.'
    } catch (aiError) {
      console.error('Error calling OpenAI for AI response:', aiError)
      aiResponse = 'Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage.'
    }

    // Save AI response as a message
    const nextAIIndex = userMessage.messageIndex + 1
    await prisma.message.create({
      data: {
        threadId: userMessage.threadId,
        role: 'assistant',
        content: aiResponse,
        messageIndex: nextAIIndex
      }
    })

    return NextResponse.json({
      success: true,
      transcript,
      audioFileId,
      aiResponse
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}
