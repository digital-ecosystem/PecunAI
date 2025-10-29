import React, { useState } from 'react';

const SignTeqTestPage = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [downloadedDoc, setDownloadedDoc] = useState<any>(null);

  const testCreateSession = async () => {
    setLoading(true);
    setError(null);
    try {
      // Create a simple test PDF (base64)
      const testPDFBase64 = 'JVBERi0xLjMKJf////8KMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovT3V0bGluZXMgMiAwIFIKL1BhZ2VzIDMgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9PdXRsaW5lcwovQ291bnQgMAo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzQgMCBSXQo+PgplbmRvYmoKNCAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDMgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDUgMCBSCj4+Cj4+Ci9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA2IDAgUgo+PgplbmRvYmoKNSAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0xlbmd0aCAyOAo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFRlc3QgRG9jdW1lbnQpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNzQgMDAwMDAgbiAKMDAwMDAwMDEyMCAwMDAwMCBuIAowMDAwMDAwMTc3IDAwMDAwIG4gCjAwMDAwMDAzNDQgMDAwMDAgbiAKMDAwMDAwMDQwNiAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDcKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQ4NAolJUVPRgo=';

      const response = await fetch('/api/signteq/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: 'Test Document Signature - Complete Flow',
          documentName: 'test_document.pdf',
          documentBase64: testPDFBase64,
          recipientEmail: 'test@example.com',
          recipientName: 'Test User',
          sessionId: `test_session_${Date.now()}`,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success && data.signing_url) {
        setSigningUrl(data.signing_url);
        // Extract document ID from response
        if (data.data?.documents?.[0]?.id) {
          setDocumentId(data.data.documents[0].id);
        }
      } else {
        setError(data.error || 'Failed to create session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testDownloadDocument = async () => {
    if (!documentId) {
      setError('No document ID available');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/signteq/documents/${documentId}/download?type=completed`);
      const data = await response.json();

      if (data.success) {
        setDownloadedDoc(data);
        
        // Also test saving the document
        const saveResponse = await fetch('/api/signteq/save-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            base64Data: data.base64,
            filename: `test_signed_document_${Date.now()}.pdf`,
            sessionId: `test_session_${Date.now()}`,
            documentId: documentId,
          }),
        });

        const saveData = await saveResponse.json();
        if (saveData.success) {
          setDownloadedDoc({ ...data, saved: saveData });
        }
      } else {
        setError(data.error || 'Failed to download document');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const simulateSigningSuccess = () => {
    // Simulate what happens when signing is completed
    console.log('🎯 Simulating signing success...');
    if (documentId) {
      testDownloadDocument();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          SignTeq Integration Test - Complete Flow
        </h1>

        {/* Test Create Session */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">1. Create Signing Session</h2>
          <button
            onClick={testCreateSession}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Test Session'}
          </button>

          {result && (
            <div className="mt-4">
              <h3 className="font-semibold text-green-600">✅ Session Created</h3>
              <pre className="bg-gray-100 p-4 rounded mt-2 text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Signing Interface */}
        {signingUrl && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">2. Document Signing</h2>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded">
                <p className="text-blue-800">
                  <strong>Signing URL:</strong> {signingUrl}
                </p>
                {documentId && (
                  <p className="text-blue-800 mt-2">
                    <strong>Document ID:</strong> {documentId}
                  </p>
                )}
              </div>
              
              <div className="flex space-x-4">
                <a
                  href={signingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Open Signing Interface
                </a>
                
                <button
                  onClick={simulateSigningSuccess}
                  className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                >
                  Simulate Signing Success
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document Download */}
        {documentId && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">3. Download Signed Document</h2>
            <button
              onClick={testDownloadDocument}
              disabled={loading}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Downloading...' : 'Download Document'}
            </button>

            {downloadedDoc && (
              <div className="mt-4">
                <h3 className="font-semibold text-green-600">✅ Document Downloaded</h3>
                <div className="bg-green-50 p-4 rounded mt-2">
                  <p><strong>Size:</strong> {downloadedDoc.size} bytes</p>
                  <p><strong>Content Type:</strong> {downloadedDoc.contentType}</p>
                  {downloadedDoc.saved && (
                    <div className="mt-2">
                      <p className="text-green-700 font-semibold">📄 Document Saved:</p>
                      <a 
                        href={downloadedDoc.saved.path} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {downloadedDoc.saved.filename}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800">❌ Error</h3>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-800 mb-2">🧪 Test Instructions</h3>
          <ol className="list-decimal list-inside text-yellow-700 space-y-1">
            <li>Click "Create Test Session" to generate a signing session</li>
            <li>Use "Open Signing Interface" to test actual signing (requires valid API key)</li>
            <li>Use "Simulate Signing Success" to test the download flow</li>
            <li>Check the downloaded document in the saved location</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SignTeqTestPage;