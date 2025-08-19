// components/SignDIframe.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { SignDIframeEvent } from '../types/signd';

interface SignDIframeProps {
  src: string;
  onEvent?: (event: SignDIframeEvent) => void;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  onUserCanceled?: () => void;
  onSignatureToken?: (token: string) => void;
  className?: string;
}

export function SignDIframe({
  src,
  onEvent,
  onSuccess,
  onError,
  onUserCanceled,
  onSignatureToken,
  className = '',
}: SignDIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
      return;
    }

    const messageData: SignDIframeEvent = event.data;
    
    // Call the general event handler
    onEvent?.(messageData);

    // Handle specific events
    switch (messageData.type) {
      case 'INITIATED':
        console.log('SignD process initiated');
        break;
        
      case 'DOCUMENT_HEIGHT':
        if (messageData.data?.height) {
          setHeight(messageData.data.height);
        }
        break;
        
      case 'SUCCESS':
        console.log('SignD process completed successfully');
        onSuccess?.();
        break;
        
      case 'SIGNATURE_TOKEN':
        if (messageData.data?.signature_token) {
          console.log('Signature token received:', messageData.data.signature_token);
          onSignatureToken?.(messageData.data.signature_token);
        }
        break;
        
      case 'USER_CANCELED':
        console.log('SignD process canceled by user');
        onUserCanceled?.();
        break;
        
      case 'ERROR':
        console.error('SignD process error:', messageData.data);
        onError?.(messageData.data);
        break;
    }
  }, [onEvent, onSuccess, onError, onUserCanceled, onSignatureToken]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      style={{ height: `${height}px` }}
      className={`w-full border-0 ${className}`}
      title="SignD Identity Verification"
    />
  );
}