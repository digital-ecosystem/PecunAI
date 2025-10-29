'use client';
import React, { useEffect, useRef } from 'react';

interface SignTeqIframeProps {
  src: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  className?: string;
}

export const SignTeqIframe: React.FC<SignTeqIframeProps> = ({
  src,
  onSuccess,
  onError,
  onCancel,
  className = "w-full h-full border-0"
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only listen to messages from SignTeq domain
      if (!event.origin.includes('signteq.io')) {
        return;
      }

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        console.log('📨 SignTeq iframe message:', data);
        
        switch (data.type) {
          case 'signature_completed':
          case 'document_signed':
          case 'success':
          case 'signing_completed':
            console.log('✅ Signing completed successfully');
            onSuccess?.();
            break;
          case 'signature_error':
          case 'error':
            console.error('❌ Signing error:', data.message);
            onError?.(data.message || 'Signing process failed');
            break;
          case 'signature_cancelled':
          case 'cancelled':
          case 'user_cancelled':
            console.log('ℹ️ Signing cancelled by user');
            onCancel?.();
            break;
          default:
            console.log('📋 SignTeq message:', data);
        }
      } catch (error) {
        console.error('Error parsing SignTeq message:', error);
      }
    };

    // Also listen for URL changes that might indicate completion
    const handleUrlChange = () => {
      if (iframeRef.current?.contentWindow) {
        try {
          const iframeUrl = iframeRef.current.contentWindow.location.href;
          if (iframeUrl.includes('success') || iframeUrl.includes('completed')) {
            console.log('✅ Detected success URL in iframe');
            onSuccess?.();
          } else if (iframeUrl.includes('error') || iframeUrl.includes('failed')) {
            console.log('❌ Detected error URL in iframe');
            onError?.('Signing process failed');
          }
        } catch (e) {
          console.log("🚀 ~ handleUrlChange ~ e:", e)
          // Cross-origin restrictions prevent accessing iframe URL
          // This is expected and not an error
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Set up interval to check for URL changes (fallback)
    const urlCheckInterval = setInterval(handleUrlChange, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(urlCheckInterval);
    };
  }, [onSuccess, onError, onCancel]);

  if (!src) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No signing URL available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200" style={{width: '100%', height: '85%'}}>
      <iframe
        ref={iframeRef}
        src={src}
        className={className}
        style={{ maxHeight: '100%', overflow: 'auto', height: '100%', width: '100%' }}
        allow="camera; microphone"
        title="SignTeq Signing Interface"
      />
    </div>
  );
};