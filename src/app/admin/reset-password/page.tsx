'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
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
      const res = await fetch('/api/admin/reset-password', {
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
          window.location.href = '/admin/signin';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Neues Passwort setzen</h1>
          <p className="text-gray-600 mt-2">Geben Sie Ihr neues Passwort ein.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!tokenFromUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Token (aus der E-Mail)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Token einfügen"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Neues Passwort</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                  tabIndex={-1}
                  onClick={() => setShowPassword((p) => !p)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Passwort bestätigen</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={isLoading}
                />
              </div>
            </div>

            {message && (
              <div
                className={`text-sm text-center py-2 px-3 rounded-lg ${
                  message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-600'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Passwort ändern'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            <Link href="/admin/signin" className="text-blue-600 hover:underline">
              Zurück zur Anmeldung
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Laden...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
