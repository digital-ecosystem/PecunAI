'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SignatureSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('session_id');
    setSessionId(id);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-green-50 to-emerald-100 text-center px-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          Dokument erfolgreich signiert!
        </h1>
        
        <p className="text-gray-700 text-lg mb-6">
          Vielen Dank! Ihre Unterschrift wurde empfangen und das Dokument wurde verarbeitet.
        </p>

        {/* Session Info */}
        {sessionId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Sitzungs-ID:</span> {sessionId}
            </p>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">Wie geht es weiter?</h3>
          <ul className="text-sm text-blue-700 space-y-1 text-left">
            <li>• Ihr signiertes Dokument wurde sicher gespeichert</li>
            <li>• Sie erhalten in Kürze eine Bestätigungs-E-Mail</li>
            <li>• Das Dokument ist nun rechtsverbindlich</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button 
            onClick={() => router.push('/customer/dashboard')}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Zurück zum Dashboard
          </button>
          
          {/* <button 
            onClick={() => router.push('/customer/stepper/' + (sessionId || 'new'))}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Start New Process
          </button> */}
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-8 text-sm text-gray-600 max-w-md">
        <p>
          Wenn Sie Fragen zu diesem Prozess haben oder Unterstützung benötigen, 
          wenden Sie sich bitte an unser Kundenservice-Team.
        </p>
      </div>
    </div>
  );
}