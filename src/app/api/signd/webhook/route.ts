// app/api/signd/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const WEBHOOK_SECRET = process.env.SIGND_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('signature');
    const userAgent = request.headers.get('user-agent');

    // Verify the webhook signature
    if (signature) {
      const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Verify user agent
    if (userAgent !== 'signteq.io API') {
      return NextResponse.json({ error: 'Invalid user agent' }, { status: 401 });
    }

    // Parse the webhook data
    const data = JSON.parse(body);
    
    // Process the webhook data here
    console.log('Received SignD webhook:', data);
    
    // You can save to database, send notifications, etc.
    // Example: await saveIdentificationResult(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}