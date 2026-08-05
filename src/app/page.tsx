'use client';

import { useEffect, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
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
      <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
        <div className="w-full max-w-md">
          <div className="rounded-[16px] bg-surface-card p-6 shadow-raised sm:p-7">
            <div className="text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent-primary" strokeWidth={1.75} />
              <p className="mt-3 text-xs text-text-muted">Wird geladen...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <CustomerLoginContent />
    </Suspense>
  );
}