'use client';
import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';

export default function OTPAuthPostgres() {
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
      setMessage('Please enter a valid email address');
      setMessageType('error');
      setLoading(false);
      return;
    }

    // Email format validation
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
      setMessage('Please enter a valid email address');
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
          setMessage('Authentication successful! Welcome back!');
          setMessageType('success');
          // Redirect to dashboard
          setTimeout(() => {
            window.location.href = '/customer/dashboard';
          }, 1000);
        } else {
          setStep('otp');
          setMessage('OTP sent to your email! Check your inbox.');
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
        setMessage(data.message || 'Failed to send OTP');
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
      setMessage('Something went wrong. Please try again.');
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
        setMessage('Authentication successful! Welcome back!');
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
      setMessage('Something went wrong. Please try again.');
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {step === 'email' ? 'Sign In' : 'Verify Code'}
          </h1>
          <p className="text-gray-600">
            {step === 'email' 
              ? 'Enter your details to receive a verification code' 
              : `Enter the 6-digit code sent to ${email}`
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
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 pl-12"
                    placeholder="Enter your email"
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
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <span>Submit</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
                    <span>Verify Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex justify-between items-center text-sm">
                <button
                  onClick={resetForm}
                  className="text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  ← Back to email
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
                    ? `Resend locked (${countdown ?? '00:00'})` 
                    : resendCooldownUntil
                    ? `Resend locked (${resendCooldownCountdown ?? '00:00'})`
                    : 'Resend code'}
                </button>
              </div>
              {resendLimit !== null && resendCount !== null && (
                <div className="text-xs text-gray-500 mt-2">{`${resendCount}/${resendLimit} sends used`}</div>
              )}
              {blockedUntil && (
                <div className="text-xs text-red-600 mt-2">You&apos;ve requested the code too many times. Try again in {countdown ?? '00:00'}.</div>
              )}
              {resendCooldownUntil && !blockedUntil && (
                <div className="text-xs text-orange-600 mt-2">You&apos;ve reached the resend limit. Try again in {resendCooldownCountdown ?? '00:00'}.</div>
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