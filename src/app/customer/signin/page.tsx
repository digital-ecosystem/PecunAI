'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Clock, Loader2, Lock, Mail, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function OTPAuthPostgresContent() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  // const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [resendCount, setResendCount] = useState<number | null>(null)
  const [resendLimit, setResendLimit] = useState<number | null>(null)
  const [blockedUntil, setBlockedUntil] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<string | null>(null)
  // const [windowMinutes, setWindowMinutes] = useState<number | null>(null)
  const [resendCooldownUntil, setResendCooldownUntil] = useState<string | null>(null)
  const [resendCooldownCountdown, setResendCooldownCountdown] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)

  const searchParams = useSearchParams();

  // Capture referral code from URL and store in cookie
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref);
      // Store referral code in cookie (expires in 30 days)
      document.cookie = `referral_code=${ref}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }
  }, [searchParams]);

  // If the user is already authenticated, redirect to dashboard.
  useEffect(() => {
    let mounted = true
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!mounted) return
        if (res.ok) {
          const data = await res.json();
          if (data?.success) {
            window.location.href = '/customer/dashboard'
          }
        }
      } catch {
        // ignore - not authenticated
      }
    }
    checkAuth()
    return () => { mounted = false }
  }, [])

  const handleSendOTP = async (e: React.FormEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!email || !email.includes('@')) {
      setMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      setMessageType('error');
      setLoading(false);
      return;
    }

    // Email format validation
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
      setMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.user) {
          setMessage('Authentifizierung erfolgreich! Willkommen zurück!');
          setMessageType('success');
          // Redirect to dashboard
          setTimeout(() => {
            window.location.href = '/customer/dashboard';
          }, 1000);
        } else {
          setStep('otp');
          setMessage('OTP wurde an Ihre E-Mail-Adresse gesendet! Überprüfen Sie Ihren Posteingang.');
          setMessageType('success');
          setTimeout(() => {
            setMessage('');
            setMessageType('');
          }, 2000);

          // update resend metadata if provided
          if (typeof data.resendCount === 'number') setResendCount(data.resendCount)
          if (typeof data.resendLimit === 'number') setResendLimit(data.resendLimit)
          // if (typeof data.windowMinutes === 'number') setWindowMinutes(data.windowMinutes)

          // If we've hit the resend limit, set a cooldown until the window expires
          if (data.resendCount >= data.resendLimit) {
            const windowMs = (data.windowMinutes || 5) * 60 * 1000
            const cooldownUntil = new Date(Date.now() + windowMs).toISOString()
            setResendCooldownUntil(cooldownUntil)
          }
        }
      } else {
        setMessage(data.message || 'OTP konnte nicht gesendet werden');
        setMessageType('error');

        // If server indicates we're blocked, show countdown
        if (data.blockedUntil) {
          setBlockedUntil(data.blockedUntil)
          if (typeof data.resendCount === 'number') setResendCount(data.resendCount)
          if (typeof data.resendLimit === 'number') setResendLimit(data.resendLimit)
          // if (typeof data.windowMinutes === 'number') setWindowMinutes(data.windowMinutes)
        }
      }
    } catch (error) {
      console.log("🚀 ~ handleSendOTP ~ error:", error)
      setMessage('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), otp }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Authentifizierung erfolgreich! Willkommen zurück!');
        setMessageType('success');
        localStorage.setItem("userEmail", email);

        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/customer/dashboard';
        }, 1000);
      } else {
        setMessage(data.message || 'Invalid OTP');
        setMessageType('error');
      }
    } catch (error) {
      console.log("🚀 ~ handleVerifyOTP ~ error:", error)
      setMessage('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('email');
    setOtp('');
    setMessage('');
  };

  // Countdown timer for blocked resend cooldown
  useEffect(() => {
    if (!blockedUntil) {
      setCountdown(null)
      return
    }

    const interval = setInterval(() => {
      const msLeft = new Date(blockedUntil).getTime() - Date.now()
      if (msLeft <= 0) {
        setBlockedUntil(null)
        setCountdown(null)
        clearInterval(interval)
        return
      }
      const mm = Math.floor(msLeft / 60000)
      const ss = Math.floor((msLeft % 60000) / 1000)
      setCountdown(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [blockedUntil])

  // Countdown timer for resend cooldown when limit is reached
  useEffect(() => {
    if (!resendCooldownUntil) {
      setResendCooldownCountdown(null)
      return
    }

    const interval = setInterval(() => {
      const msLeft = new Date(resendCooldownUntil).getTime() - Date.now()
      if (msLeft <= 0) {
        setResendCooldownUntil(null)
        setResendCooldownCountdown(null)
        clearInterval(interval)
        return
      }
      const mm = Math.floor(msLeft / 60000)
      const ss = Math.floor((msLeft % 60000) / 1000)
      setResendCooldownCountdown(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [resendCooldownUntil])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-base p-4">
      {/* Signature moment for this surface: one soft accent glow behind the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-primary/10 blur-[120px]"
      />

      <div className="relative w-full max-w-md">
        {/* Referral Banner */}
        {referralCode && (
          <div className="mb-6 flex items-center gap-3 rounded-[12px] border border-line bg-surface-subtle p-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-card text-accent-primary">
              <Users className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-primary">Berater-Einladung</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-text-muted">Sie wurden von einem Berater eingeladen</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary shadow-soft">
            <Lock className="h-6 w-6 text-text-on-accent" strokeWidth={1.75} />
          </div>
          <h1 className="text-[22px] font-bold leading-tight text-text-primary">
            {step === 'email' ? 'Anmelden' : 'Code bestätigen'}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">
            {step === 'email'
              ? 'Geben Sie Ihre Daten ein, um einen Verifizierungscode für Ihr Digital Onboarding Guide Konto zu erhalten.'
              // : `Enter the 6-digit code sent to ${email}`
              : `Geben Sie den 6-stelligen Code ein, der an ${email} gesendet wurde.`
            }
          </p>
        </div>

        {/* Auth Form */}
        <div className="rounded-[16px] bg-surface-card p-6 shadow-raised sm:p-7">
          {step === 'email' ? (
            <div className="space-y-5">
              {/* Name Input */}
              {/* <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 pl-12"
                    placeholder="Enter your full name"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div> */}

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-text-primary">
                  E-Mail-Adresse
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                    strokeWidth={1.75}
                  />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !loading && email) {
                        handleSendOTP(e as React.FormEvent<HTMLButtonElement>);
                      }
                    }}
                    required
                    className="w-full rounded-[10px] border border-surface-raised bg-surface-card py-2.5 pl-9 pr-3 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring"
                    placeholder="Geben Sie Ihre E-Mail-Adresse ein"
                  />
                </div>
              </div>

              <button
                onClick={handleSendOTP}
                disabled={loading || !email}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-accent-primary px-5 py-3 text-xs font-semibold text-text-on-accent transition-colors hover:bg-accent-primary-hov focus:shadow-focus-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                    <span>Wird geladen...</span>
                  </>
                ) : (
                  <>
                    <span>Absenden</span>
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label htmlFor="otp" className="mb-1.5 block text-xs font-semibold text-text-primary">
                  Verifizierungscode
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading && otp.length === 6) {
                      handleVerifyOTP(e as React.FormEvent<HTMLButtonElement>);
                    }
                  }}
                  required
                  className="w-full rounded-[10px] border border-surface-raised bg-surface-card px-3 py-3 text-center font-mono text-xl tracking-[0.35em] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              <button
                onClick={handleVerifyOTP}

                disabled={loading || otp.length !== 6}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-accent-primary px-5 py-3 text-xs font-semibold text-text-on-accent transition-colors hover:bg-accent-primary-hov focus:shadow-focus-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Code bestätigen</span>
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </>
                )}
              </button>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <button
                    onClick={resetForm}
                    className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Zurück zur E-Mail
                  </button>
                  <button
                    onClick={(e) => {
                      setStep('email');
                      handleSendOTP(e);
                    }}
                    disabled={loading || !!blockedUntil || !!resendCooldownUntil}
                    className={`text-xs font-semibold text-accent-primary transition-colors ${(blockedUntil || resendCooldownUntil) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-accent-primary-hov hover:underline'}`}
                  >
                    {blockedUntil
                      ? `Erneutes Senden gesperrt (${countdown ?? '00:00'})`
                      : resendCooldownUntil
                      ? `Erneutes Senden gesperrt (${resendCooldownCountdown ?? '00:00'})`
                      : 'Code erneut senden'}
                  </button>
                </div>
                {/* {resendLimit !== null && resendCount !== null && (
                  <div className="text-xs text-gray-500 mt-2">{`${resendCount}/${resendLimit} Sendungen verwendet`}</div>
                )} */}
                {blockedUntil && (
                  <div className="flex items-start gap-1.5 text-[11px] leading-relaxed text-status-flagged-fg">
                    <AlertCircle className="mt-px h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
                    <span>Sie haben den Code zu oft angefordert. Versuchen Sie es erneut in {countdown ?? '00:00'}.</span>
                  </div>
                )}
                {resendCooldownUntil && !blockedUntil && (
                  <div className="flex items-start gap-1.5 text-[11px] leading-relaxed text-status-neutral-fg">
                    <Clock className="mt-px h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
                    <span>Sie haben das Limit für erneute Sendungen erreicht. Versuchen Sie es erneut in {resendCooldownCountdown ?? '00:00'}.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div className={`mt-5 flex items-start gap-2 rounded-[10px] border px-3 py-2.5 text-xs ${
              messageType === 'success'
                ? 'border-status-approved-border bg-status-approved text-status-approved-fg'
                : 'border-status-flagged-border bg-status-flagged text-status-flagged-fg'
            }`}>
              {messageType === 'success' ? (
                <CheckCircle2 className="mt-px h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
              ) : (
                <AlertCircle className="mt-px h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
              )}
              <span>{message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OTPAuthPostgres() {
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
      <OTPAuthPostgresContent />
    </Suspense>
  );
}
