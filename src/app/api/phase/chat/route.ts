// app/api/chat/route.ts

import { getChatMessages, saveChatMessage } from '@/lib/chat'
import { getMainProductPrompt, getProductAISettings, getSessionProductId } from '@/lib/ai-settings'
import { Role } from '@/types'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs'
import type { AssistantTool } from 'openai/resources/beta/assistants'


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

    // Get AI settings for the session
    const productId = await getSessionProductId(sessionId)
    const mainPrompt = await getMainProductPrompt()
    const productSettings = productId ? await getProductAISettings(productId) : null

    // Use AI settings for model selection and instructions
    const model = productSettings?.model || mainPrompt?.aiModel || 'gpt-4'
    const systemPrompt = mainPrompt?.mainPrompt || 'You are a helpful financial assistant.'

    // Construct chat context
    const conversationHistory: ChatCompletionMessageParam[] = messagesSoFar.map(msg => ({
      role: msg.role === Role.customer ? 'user' : 'assistant',
      content: msg.content
    }))

    conversationHistory.push({ role: 'user', content: message })

    // Build tools array if vector_id is available
    const tools: AssistantTool[] = [];
    
    if (mainPrompt?.vectorId) {
      tools.push({
        type: 'file_search'
      });
    }

    if (productSettings?.vectorId && productSettings.vectorId !== mainPrompt?.vectorId) {
      tools.push({
        type: 'file_search'
      });
    }

    if (mainPrompt?.mcpUrl) {
      tools.push({
        type: 'function',
        function: {
          name: 'web_retrieval',
          description: 'Retrieve information from MCP endpoint',
          parameters: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'MCP endpoint URL'
              }
            },
            required: ['url']
          }
        }
      });
    }

    // Use chat completions with enhanced system prompt
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
      ],
    });
    
    const botResponse = completion.choices[0].message?.content;
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
      model: model,
      usedAssistant: tools.length > 0
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
