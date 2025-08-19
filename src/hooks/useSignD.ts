// hooks/useSignD.ts
import { useState, useCallback } from 'react';
import { SignDAPI } from '../lib/signd-api';
import { SignDHandshakePayload, SignDHandshakeResponse, SignDResult } from '@/types/signd';

export function useSignD(credentials: { login: string; token: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SignDHandshakeResponse | null>(null);
  const [result, setResult] = useState<SignDResult | null>(null);

  const api = new SignDAPI(credentials);

  const createSession = useCallback(async (payload: Omit<SignDHandshakePayload, 'login' | 'token'>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.createSession(payload);
      setSessionData(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const getResult = useCallback(async (sessionToken: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.getResult(sessionToken);
      setResult(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const downloadIDV = useCallback(async (sessionToken: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const blob = await api.downloadIDV(sessionToken);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'identity-verification.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return blob;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const getIframeUrl = useCallback((sessionToken: string, locale?: 'en' | 'de' | 'es' | 'fr' | 'ro', testMode?: boolean) => {
    return api.getIframeUrl(sessionToken, locale, testMode);
  }, [api]);

  return {
    isLoading,
    error,
    sessionData,
    result,
    createSession,
    getResult,
    downloadIDV,
    getIframeUrl,
    setError,
  };
}