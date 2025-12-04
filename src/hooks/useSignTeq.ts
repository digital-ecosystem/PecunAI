'use client';
import { useState } from 'react';
import { CONFIG } from '@/config/constants';

export interface SignTeqField {
  page: number;
  x: number;
  y: number;
  type: 'custom-stamp' | 'signature';
  width: number;
  height: number;
  required: boolean;
  read_only: boolean;
  recipient_id: number;
}

export interface SignTeqDocument {
  name: string;
  base64: string;
  fields: SignTeqField[];
}

export interface SignTeqRecipient {
  id: number;
  type: 'signatory';
  qes: boolean;
  email: string;
  name: string;
  do_not_notify: boolean;
  language: string;
}

export interface SignTeqPayload {
  subject: string;
  type: 'signature';
  redirect_success_url: string;
  redirect_error_url: string;
  settings: {
    close_on_success: boolean;
  };
  meta?: {
    signature_id?: string;
    signature_token?: string;
  };
  recipients: SignTeqRecipient[];
  documents: SignTeqDocument[];
}

export interface SignTeqResponse {
  success: boolean;
  signature_id?: string;
  signature_token?: string;
  signing_url?: string;
  message?: string;
  error?: string;
}

export const useSignTeq = (apiToken: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signTeqData, setSignTeqData] = useState<SignTeqResponse | null>(null);

  const createSigningSession = async (payload: SignTeqPayload): Promise<SignTeqResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${CONFIG.SIGNTEQ.API_URL}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      setSignTeqData(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getSigningUrl = (signatureId: string, signatureToken: string): string => {
    return `${CONFIG.SIGNTEQ.IFRAME_ORIGIN.replace('https://', 'https://app.')}/sign/${signatureId}?token=${signatureToken}`;
  };

  return {
    loading,
    error,
    signTeqData,
    createSigningSession,
    getSigningUrl,
    setError,
  };
};