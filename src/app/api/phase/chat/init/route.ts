import { prisma } from '@/lib/prisma';
import { getChatMessages, saveChatMessage } from '@/lib/chat';
import { getMainProductPrompt, getProductAISettings, getSessionProductId, getWelcomeMessage } from '@/lib/ai-settings';
import { Role } from '@/types';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Tool } from 'openai/resources/responses/responses.mjs';
// import type { AssistantTool } from 'openai/resources/beta/assistants';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// POST: Initialize chat with automatic AI message when product is selected
export async function POST(req: Request) {
  try {
    const { sessionId, productId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ message: 'SessionId is required' }, { status: 400 });
    }

    // Get the thread for this session
    const thread = await prisma.thread.findUnique({
      where: { qaSessionId: sessionId }
    });

    if (!thread) {
      return NextResponse.json({ message: 'Thread not found for session' }, { status: 404 });
    }

    // Check if we already have messages in this thread
    const existingMessages = await getChatMessages(thread.id);
    if (existingMessages.length > 0) {
      return NextResponse.json({
        message: 'Chat already initialized',
        threadId: thread.id,
        success: true
      });
    }

    // Get the product ID from session suggestion if not provided
    const finalProductId = productId || await getSessionProductId(sessionId);
    
    if (!finalProductId) {
      return NextResponse.json({ message: 'No product found for session' }, { status: 404 });
    }

    // Get the product details
    const product = await prisma.product.findUnique({
      where: { id: finalProductId },
      select: {
        id: true,
        name: true,
        shortName: true
      }
    });

    // Get main product prompt settings
    const mainPrompt = await getMainProductPrompt();
    if (!mainPrompt) {
      return NextResponse.json({ message: 'Main product prompt not configured' }, { status: 500 });
    }

    // Get product-specific AI settings
    const productSettings = await getProductAISettings(finalProductId);

    // Prepare OpenAI request
    const model = productSettings?.model || mainPrompt.aiModel;
    const instructions = mainPrompt.mainPrompt;
    
    // Get welcome message for the product
    // const welcomeMessage = getWelcomeMessage(product?.shortName || product?.name || null);
    const welcomeMessage = productSettings?.prompt || getWelcomeMessage(product?.shortName || product?.name || null);

    try {
      // Build the tools array conditionally
      const tools: Tool[] = [];
      
      // Add vector retrieval if vectorId is available from main prompt
      if (mainPrompt.vectorId) {
        tools.push({
          type: 'file_search',
          vector_store_ids: [mainPrompt.vectorId]
        });
      }
      
      // Add MCP URL if available - using function calling
      if (mainPrompt.mcpUrl) {
        tools.push({
          type: 'mcp',
          server_label: 'mcp_retrieval',
          server_url: mainPrompt.mcpUrl
        //   function: {
        //     name: 'web_retrieval',
        //     description: 'Retrieve information from MCP endpoint',
        //     parameters: {
        //       type: 'object',
        //       properties: {
        //         url: {
        //           type: 'string',
        //           description: 'MCP endpoint URL',
        //           default: mainPrompt.mcpUrl
        //         }
        //       },
        //       required: ['url']
        //     }
        //   }
        });
      }

      // Create assistant with instructions
      const assistant = await openai.responses.create({
        // name: `Product Assistant - ${product?.name || 'Financial Advisor'}`,
        instructions: instructions,
        model: model,
        tools: tools.length > 0 ? tools : undefined,
        // input: welcomeMessage,
      });

      // Create a thread for the conversation
    //   const openaiThread = await openai.responses.create();

      // Create the initial message
      await openai.beta.threads.messages.create(assistant.id, {
        role: 'assistant',
        content: welcomeMessage
      });

      // Save the initial AI message to our database
      await saveChatMessage(
        Role.assistant,
        welcomeMessage,
        thread.id,
        0
      );

      // Update session status to indicate chat is active
      await prisma.qASession.update({
        where: { id: sessionId },
        data: { 
          phase: 'CONSULTATION',
          status: 'CHAT_ACTIVE'
        }
      });

      return NextResponse.json({
        success: true,
        message: welcomeMessage,
        threadId: thread.id,
        assistantId: assistant.id,
        openaiThreadId: assistant.id,
        productId: finalProductId,
        productName: product?.name
      });

    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      
      // Fallback: save welcome message without OpenAI processing
      await saveChatMessage(
        Role.assistant,
        welcomeMessage,
        thread.id,
        0
      );

      return NextResponse.json({
        success: true,
        message: welcomeMessage,
        threadId: thread.id,
        productId: finalProductId,
        productName: product?.name,
        fallback: true
      });
    }

  } catch (error) {
    console.error('Chat initialization error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize chat',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}