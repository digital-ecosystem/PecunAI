'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import OTPAuthPostgres from "./customer/signin/page";

function CustomerLoginContent() {
  const searchParams = useSearchParams();

  // Capture referral code from URL and store/overwrite in cookie
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      document.cookie = `referral_code=${ref}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      document.cookie = `autostart_session=1; path=/; max-age=${60 * 30}; SameSite=Lax`;
    }

    const agent = searchParams.get('agent');
    if (agent) {
      document.cookie = `agent_code=${agent}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }
  }, [searchParams]);

  return (
    <OTPAuthPostgres />
  )
}

export default function CustomerLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Wird geladen...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <CustomerLoginContent />
    </Suspense>
  );
}