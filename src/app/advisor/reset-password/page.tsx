'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Lock, Eye, EyeOff, KeyRound, Users } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  const [token, setToken] = useState(tokenFromUrl ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!token.trim()) {
      setMessage({ type: 'error', text: 'Ungültiger Link. Bitte fordern Sie einen neuen Link an.' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Das Passwort muss mindestens 8 Zeichen lang sein.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Die Passwörter stimmen nicht überein.' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/advisor/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), newPassword }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setToken('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          window.location.href = '/advisor/signin';
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Ein Fehler ist aufgetreten.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.' });
    } finally {
      setIsLoading(false);
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
        <div className="mb-7 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary shadow-soft">
            <Users className="h-6 w-6 text-text-on-accent" strokeWidth={1.75} />
          </div>
          <h1 className="text-[22px] font-bold leading-tight text-text-primary">Neues Passwort setzen</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">
            Geben Sie Ihr neues Passwort ein.
          </p>
        </div>

        <div className="rounded-[16px] bg-surface-card p-6 shadow-raised sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!tokenFromUrl && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">
                  Token (aus der E-Mail)
                </label>
                <div className="relative">
                  <KeyRound
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                    strokeWidth={1.75}
                  />
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Token einfügen"
                    className="w-full rounded-[10px] border border-surface-raised bg-surface-card py-2.5 pl-9 pr-3 font-mono text-xs text-text-primary outline-none transition-colors placeholder:font-sans placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-primary">Neues Passwort</label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  strokeWidth={1.75}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  className="w-full rounded-[10px] border border-surface-raised bg-surface-card py-2.5 pl-9 pr-10 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary focus:shadow-focus-ring focus:outline-none"
                  tabIndex={-1}
                  onClick={() => setShowPassword((p) => !p)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-primary">Passwort bestätigen</label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  strokeWidth={1.75}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                  className="w-full rounded-[10px] border border-surface-raised bg-surface-card py-2.5 pl-9 pr-3 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading}
                />
              </div>
            </div>

            {message && (
              <div
                className={`flex items-start gap-2 rounded-[10px] border px-3 py-2.5 text-xs ${
                  message.type === 'success'
                    ? 'border-status-approved-border bg-status-approved text-status-approved-fg'
                    : 'border-status-flagged-border bg-status-flagged text-status-flagged-fg'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="mt-px h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
                ) : (
                  <AlertCircle className="mt-px h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-accent-primary px-5 py-3 text-xs font-semibold text-text-on-accent transition-colors hover:bg-accent-primary-hov focus:shadow-focus-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                'Passwort ändern'
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-text-muted">
            <Link
              href="/advisor/signin"
              className="font-semibold text-accent-primary transition-colors hover:text-accent-primary-hov hover:underline"
            >
              Zurück zur Anmeldung
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdvisorResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface-base text-xs text-text-muted">
          Laden...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
