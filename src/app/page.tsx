'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import OTPAuthPostgres from "./customer/signin/page";

export default function CustomerLogin() {
  const searchParams = useSearchParams();

  // Capture referral code from URL and store/overwrite in cookie
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      // Always overwrite the cookie with the new referral code
      document.cookie = `referral_code=${ref}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }
  }, [searchParams]);

  return (
    <OTPAuthPostgres />
  )
}