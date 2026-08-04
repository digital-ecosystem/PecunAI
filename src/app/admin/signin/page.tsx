
'use client';

import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const handleLogin = async () => {
    setError('');

    if (!email || !password) {
      setError('E-Mail und Passwort sind erforderlich');
      return;
    }

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.success) {
      router.push('/admin/dashboard');
    } else {
      setError(data.message || 'Ungültige E-Mail oder Passwort');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-base p-4">
      {/* Signature moment for this surface: one soft accent glow behind the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-primary/10 blur-[120px]"
      />

      <div className="relative w-full max-w-md">
        {/* Logo/Icon */}
        <div className="mb-7 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary shadow-soft">
            <Lock className="h-6 w-6 text-text-on-accent" strokeWidth={1.75} />
          </div>
          <h1 className="text-[22px] font-bold leading-tight text-text-primary">Anmelden</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">
            Geben Sie Ihre Daten ein, um sich anzumelden
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-[16px] bg-surface-card p-6 shadow-raised sm:p-7">
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-primary">
                E-Mail-Adresse
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  strokeWidth={1.75}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Geben Sie Ihre E-Mail ein"
                  className="w-full rounded-[10px] border border-surface-raised bg-surface-card py-2.5 pl-9 pr-3 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-primary">
                Passwort
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  strokeWidth={1.75}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Geben Sie Ihr Passwort ein"
                  className="w-full rounded-[10px] border border-surface-raised bg-surface-card py-2.5 pl-9 pr-10 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary focus:shadow-focus-ring focus:outline-none"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
              <div className="mt-2 text-right">
                <a
                  href="/admin/forgot-password"
                  className="text-xs font-semibold text-accent-primary transition-colors hover:text-accent-primary-hov hover:underline"
                >
                  Passwort vergessen?
                </a>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-[10px] border border-status-flagged-border bg-status-flagged px-3 py-2.5 text-xs text-status-flagged-fg">
                <AlertCircle className="mt-px h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleLogin}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-accent-primary px-5 py-3 text-xs font-semibold text-text-on-accent transition-colors hover:bg-accent-primary-hov focus:shadow-focus-ring focus:outline-none"
            >
              Anmelden
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
