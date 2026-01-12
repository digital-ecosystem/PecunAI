'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { Mail, Lock, ArrowRight, Users } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Referral Banner */}
        {referralCode && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800">Partner-Empfehlung</p>
              <p className="text-xs text-emerald-600">Sie wurden von einem Partner eingeladen</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {step === 'email' ? 'Anmelden' : 'Code bestätigen'}
          </h1>
          <p className="text-gray-600">
            {step === 'email' 
              ? 'Geben Sie Ihre Daten ein, um einen Verifizierungscode für Ihr Pecun AI Konto zu erhalten.' 
              // : `Enter the 6-digit code sent to ${email}`
              : `Geben Sie den 6-stelligen Code ein, der an ${email} gesendet wurde.`
            }
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          {step === 'email' ? (
            <div className="space-y-6">
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
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail-Adresse
                </label>
                <div className="relative">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 pl-12"
                    placeholder="Geben Sie Ihre E-Mail-Adresse ein"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSendOTP}
                disabled={loading || !email}
                className="w-full bg-gradient-to-r cursor-pointer from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Wird geladen...</span>
                  </>
                ) : (
                  <>
                    <span>Absenden</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-center text-2xl font-mono tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              <button
                onClick={handleVerifyOTP}

                disabled={loading || otp.length !== 6}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 cursor-pointer text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Code bestätigen</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex justify-between items-center text-sm">
                <button
                  onClick={resetForm}
                  className="text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  ← Zurück zur E-Mail
                </button>
                <button
                  onClick={(e) => {
                    setStep('email');
                    handleSendOTP(e);
                  }}
                  disabled={loading || !!blockedUntil || !!resendCooldownUntil}
                  className={`text-blue-600 transition-colors cursor-pointer ${(blockedUntil || resendCooldownUntil) ? 'opacity-50 cursor-not-allowed' : 'hover:text-blue-800'}`}
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
                <div className="text-xs text-red-600 mt-2">Sie haben den Code zu oft angefordert. Versuchen Sie es erneut in {countdown ?? '00:00'}.</div>
              )}
              {resendCooldownUntil && !blockedUntil && (
                <div className="text-xs text-orange-600 mt-2">Sie haben das Limit für erneute Sendungen erreicht. Versuchen Sie es erneut in {resendCooldownCountdown ?? '00:00'}.</div>
              )}
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div className={`mt-4 p-4 rounded-lg text-sm ${
              messageType === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
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
      <OTPAuthPostgresContent />
    </Suspense>
  );
}