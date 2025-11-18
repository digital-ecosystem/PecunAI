// app/api/chat/route.ts

import { getChatMessages, saveChatMessage } from '@/lib/chat'
import { getMainProductPrompt, getProductAISettings, getSessionProductId } from '@/lib/ai-settings'
import { Role } from '@/types'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { ResponseInputItem } from 'openai/resources/responses/responses.mjs'
import { prisma } from '@/lib/prisma'
import { createReadStream } from 'fs'
import { join } from 'path'
// import type {ResponseInputItem} from 'openai/resources/beta/responses'


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// POST: Chat with OpenAI and save messages (handles both text and audio)
export async function POST(req: Request) {
  try {
    const { message, audioFileId, sessionId, threadId = 'default' } = await req.json()
    console.log("🚀 ~ POST ~ message, audioFileId, sessionId, threadId:", message, audioFileId, sessionId, threadId)

    let userMessage = message
    const audioFileIdToUse = audioFileId

    // If audioFileId is provided, transcribe it first
    if (audioFileId && !message) {
      const audioFile = await prisma.audioFile.findUnique({
        where: { id: audioFileId }
      })

      if (!audioFile) {
        return NextResponse.json(
          { error: 'Audio file not found' },
          { status: 404 }
        )
      }

      // Read file from disk and transcribe
      const filePath = join(process.cwd(), 'public', audioFile.filePath)
      const fileStream = createReadStream(filePath)

      try {
        const transcription = await openai.audio.transcriptions.create({
          file: fileStream as unknown as Parameters<typeof openai.audio.transcriptions.create>[0]['file'],
          model: 'whisper-1',
          language: 'de' // German language
        })

        userMessage = transcription.text

        // Update audio file with transcript
        await prisma.audioFile.update({
          where: { id: audioFileId },
          data: { transcript: userMessage }
        })
      } catch (transcribeError) {
        console.error('Transcription error:', transcribeError)
        return NextResponse.json(
          { error: 'Failed to transcribe audio' },
          { status: 500 }
        )
      }
    }

    if (!userMessage) {
      return NextResponse.json({ message: 'Message or audioFileId is required' }, { status: 400 })
    }

    const currentSessionId = sessionId
    let messageIndex = 0

    const messagesSoFar = await getChatMessages(threadId || currentSessionId)
    messageIndex = messagesSoFar.length

    // Save user message (with audioFileId if it exists)
    await saveChatMessage(
      Role.customer,
      userMessage,
      threadId || currentSessionId,
      messageIndex,
      audioFileIdToUse
    )

    // Get AI settings for the session
    const productId = await getSessionProductId(sessionId)
    const mainPrompt = await getMainProductPrompt()
    const productSettings = productId ? await getProductAISettings(productId) : null

    // Use AI settings for model selection and instructions
    const model = mainPrompt?.aiModel || 'gpt-5'
    const systemPrompt = mainPrompt?.mainPrompt || 'You are a helpful financial assistant.'

    console.log('Using model:', model)
    console.log('Using system prompt:', systemPrompt)

    // Construct chat context
    const conversationHistory: ResponseInputItem[] = messagesSoFar.map(msg => ({
      role: msg.role === Role.customer ? 'user' : 'assistant',
      content: msg.content
    }))

    conversationHistory.push({ role: 'user', content: userMessage })

    // Build tools array if vector_id is available
    const tools: OpenAI.Responses.Tool[] = [];
    
    if (mainPrompt?.vectorId) {
      tools.push({
        type: 'file_search',
        file_search: {
          vector_store_ids: [mainPrompt.vectorId]
        }
      } as unknown as OpenAI.Responses.FileSearchTool);
    }

    /*if (mainPrompt?.mcpUrl) {
      tools.push({
      type: "mcp",
      server_label: "dmcp",
      server_description: "mcp tool",
      server_url: mainPrompt.mcpUrl,
      require_approval: "never",
    });
    }*/

   console.log("🚀 ~ POST ~ conversationHistory:", JSON.stringify(conversationHistory, null, 2))
    const response = await openai.responses.create({
      model: model,
      stream: true,
      instructions: systemPrompt + (productSettings?.firstMessage ? `\n\n${productSettings.firstMessage}` : '' ),
      input: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
      ],
      ...(tools.length > 0 && { tools: tools })
    });

    // Create a readable stream for the response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullResponse = '';

        try {
          for await (const chunk of response) {
            if (chunk.type === 'response.output_text.delta') {
              const content = chunk.delta || '';
              if (content) {
                fullResponse += content;
                // Send the chunk to the client
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content, done: false })}\n\n`));
              }
            } else if (chunk.type === 'response.completed') {
              // Save the complete response to database
              await saveChatMessage(
                Role.assistant,
                fullResponse,
                threadId || currentSessionId,
                messageIndex + 1
              );
              
              // Send final chunk
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                content: '', 
                done: true, 
                sessionId: currentSessionId,
                threadId: threadId || currentSessionId,
                model: model,
                usedAssistant: tools.length > 0,
                transcript: userMessage
              })}\n\n`));
              
              controller.close();
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('API error:', JSON.stringify(error))
    return NextResponse.json({
      message: 'Sorry, I encountered an error processing your request.',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}

// GET: Retrieve chat history
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  const threadId = searchParams.get('threadId')

  if (!sessionId && !threadId) {
    return NextResponse.json({ message: 'SessionId or threadId is required' }, { status: 400 })
  }

  try {
    const messages = await getChatMessages(threadId || sessionId!)

    return NextResponse.json({
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt,
        index: msg.messageIndex,
        audioFileId: msg.audioFileId,
        audioFile: msg.audioFile ? {
          id: msg.audioFile.id,
          fileName: msg.audioFile.fileName,
          filePath: msg.audioFile.filePath,
          mimeType: msg.audioFile.mimeType,
          transcript: msg.audioFile.transcript,
          createdAt: msg.audioFile.createdAt
        } : undefined
      }))
    })
  } catch (error) {
    console.error('Error fetching chat history:', error)
    return NextResponse.json({
      message: 'Error fetching chat history',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}
