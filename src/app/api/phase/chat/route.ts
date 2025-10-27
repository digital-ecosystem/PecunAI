// app/api/chat/route.ts

import { getChatMessages, saveChatMessage } from '@/lib/chat'
import { Role } from '@/types'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs'


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// POST: Chat with OpenAI and save messages
export async function POST(req: Request) {
  try {
    const { message, sessionId, threadId = 'default' } = await req.json()

    if (!message) {
      return NextResponse.json({ message: 'Message is required' }, { status: 400 })
    }

    const currentSessionId = sessionId
    let messageIndex = 0


    const messagesSoFar = await getChatMessages(threadId || currentSessionId)
    messageIndex = messagesSoFar.length

    await saveChatMessage(
      Role.customer,
      message,
      threadId || currentSessionId,
      messageIndex
    )

    // Construct chat context
    const conversationHistory: ChatCompletionMessageParam[] = messagesSoFar.map(msg => ({
      role: msg.role === Role.customer ? 'user' : 'assistant',
      content: msg.content
    }))

    conversationHistory.push({ role: 'user', content: message })

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        ...conversationHistory
      ],
      // max_tokens: 500,
      // temperature: 0.7,
    })


    // const responseAPI = await openai.responses.create({
    //   instructions: '', // Main Prompt of the product
    //   model: 'gpt-3.5-turbo',
    //   tools: [
    //     {
    //       type: 'web_retrieval',
    //       parameters: {
    //         url: 'https://example.com/mcp-endpoint' // MCP URL of the product
    //       }
    //     },

    //   ],
      
    //   messages: [
    //     { role: 'system', content: 'You are a helpful assistant.' },
    //     ...conversationHistory
    //   ],
    //   max_tokens: 500,
    //   temperature: 0.7,
    // })

    const botResponse = completion.choices[0].message?.content
    if (!botResponse) throw new Error('No response from OpenAI')

    await saveChatMessage(
      Role.assistant,
      botResponse,
      threadId || currentSessionId,
      messageIndex + 1
    )

    return NextResponse.json({
      message: botResponse,
      sessionId: currentSessionId,
      threadId: threadId || currentSessionId,
      usage: completion.usage
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
        index: msg.messageIndex
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
