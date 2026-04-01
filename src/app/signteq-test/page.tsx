'use client';
import React, { useState } from 'react';
import { SignTeqIframe } from '@/components/SignTeqIframe';
import { pdfBlobToBase64 } from '@/utils/pdfUtils';

// Simple test PDF content (minimal PDF structure)
const createTestPDF = () => {
  const content = 'Test document for signing';
  const blob = new Blob([content], { type: 'application/pdf' });
  return blob;
};

export default function SignTeqTestPage() {
  const [loading, setLoading] = useState(false);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCreateSigningSession = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create a test PDF (in real implementation, this would be your generated document)
      const testPdfBlob = createTestPDF();
      const pdfBase64 = await pdfBlobToBase64(testPdfBlob);

      const response = await fetch('/api/signteq/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: 'Test Document Signature',
          documentName: 'test_document.pdf',
          documentBase64: pdfBase64,
          recipientEmail: 'test@example.com',
          recipientName: 'Test User',
          sessionId: 'test_session_123',
        }),
      });

      const data = await response.json();

      if (data.success && data.signing_url) {
        setSigningUrl(data.signing_url);
        console.log('✅ SignTeq session created:', data.signature_id);
      } else {
        throw new Error(data.error || 'Failed to create SignTeq session');
      }
    } catch (err) {
      console.error('❌ SignTeq test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSigningSuccess = () => {
    console.log('✅ Document signed successfully!');
    setSuccess(true);
  };

  const handleSigningError = (error: string) => {
    console.error('❌ Signing error:', error);
    setError(error);
  };

  const handleSigningCancel = () => {
    console.log('ℹ️ Signing cancelled by user');
    setSigningUrl(null);
  };

  const resetTest = () => {
    setSigningUrl(null);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            SignTeq Integration Test
          </h1>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Test the SignTeq API integration by creating a signing session and signing a test document.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-800 mb-2">Prerequisites:</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Set <code>SIGNTEQ_API_KEY</code> in your .env file</li>
                <li>• Ensure the API token is valid and active</li>
                <li>• Test with <code>qes: false</code> to skip identity verification</li>
              </ul>
            </div>
          </div>

          {!signingUrl && !success && (
            <div className="text-center">
              <button
                onClick={handleCreateSigningSession}
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Signing Session...
                  </span>
                ) : (
                  'Start SignTeq Test'
                )}
              </button>
            </div>
          )}

          {signingUrl && !success && (
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Document Ready for Signature
                </h2>
                <p className="text-gray-600">
                  Please sign the document below to complete the test.
                </p>
              </div>
              
              <SignTeqIframe
                src={signingUrl}
                onSuccess={handleSigningSuccess}
                onError={handleSigningError}
                onCancel={handleSigningCancel}
                className="rounded-lg border border-gray-200"
              />
              
              <div className="mt-4 text-center">
                <button
                  onClick={resetTest}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Reset Test
                </button>
              </div>
            </div>
          )}

          {success && (
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-8">
                <div className="text-green-600 text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-green-800 mb-2">
                  Signing Completed Successfully!
                </h2>
                <p className="text-green-700 mb-6">
                  The document has been signed and the SignTeq integration is working correctly.
                </p>
                <button
                  onClick={resetTest}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  Run Test Again
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
              <p className="text-red-700">{error}</p>
              <button
                onClick={resetTest}
                className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Integration Details:</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>API Endpoint:</strong> /api/signteq/create-session</p>
              <p><strong>Document Type:</strong> PDF with signature field</p>
              <p><strong>Signature Position:</strong> Page 1, coordinates (300, 500)</p>
              <p><strong>Field Size:</strong> 450x100 pixels</p>
              <p><strong>QES Mode:</strong> Disabled for testing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}