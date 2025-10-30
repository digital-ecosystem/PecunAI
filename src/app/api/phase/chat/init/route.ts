import { prisma } from '@/lib/prisma';
import { getChatMessages, saveChatMessage } from '@/lib/chat';
import { getMainProductPrompt, getProductAISettings, getSessionProductId, getWelcomeMessage } from '@/lib/ai-settings';
import { Role } from '@/types';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Tool } from 'openai/resources/responses/responses.mjs';
// import type { AssistantTool } from 'openai/resources/beta/assistants';


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


    // Get product-specific AI settings
    const productSettings = await getProductAISettings(finalProductId);

    if (!productSettings || !productSettings.first_message) {
      return NextResponse.json({ message: 'No AI settings found for product' }, { status: 404 });
    }
    const welcomeMessage = productSettings.first_message;
    try {

      // Save the itial AI message to our database
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