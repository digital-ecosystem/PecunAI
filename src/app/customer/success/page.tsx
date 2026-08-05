'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { CheckCircle2, Info, LayoutDashboard, Loader2 } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('session_id');
    setSessionId(id);
  }, [searchParams]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-base p-4 text-center">
      {/* Signature moment for this surface: one soft accent glow behind the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-primary/10 blur-[120px]"
      />

      <div className="relative w-full max-w-md">
        <div className="rounded-[16px] bg-surface-card p-6 shadow-raised sm:p-7">
          {/* Success Icon */}
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-status-approved">
            <CheckCircle2 className="h-6 w-6 text-status-approved-fg" strokeWidth={1.75} />
          </div>

          {/* Success Message */}
          <h1 className="text-[22px] font-bold leading-tight text-text-primary">
            Dokument erfolgreich signiert!
          </h1>

          <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">
            Vielen Dank! Ihre Unterschrift wurde empfangen und das Dokument wurde verarbeitet.
          </p>

          {/* Session Info */}
          {sessionId && (
            <div className="mt-6 rounded-[12px] border border-line bg-surface-subtle p-3">
              <p className="text-xs text-text-muted">
                <span className="font-semibold text-text-primary">Sitzungs-ID:</span> {sessionId}
              </p>
            </div>
          )}

          {/* Next Steps */}
          <div className="mt-6 rounded-[12px] border border-line bg-surface-subtle p-4 text-left">
            <div className="mb-2 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.75} />
              <h3 className="text-xs font-semibold text-text-primary">Wie geht es weiter?</h3>
            </div>
            <ul className="space-y-1 text-[11px] leading-relaxed text-text-muted">
              <li>• Ihr signiertes Dokument wurde sicher gespeichert</li>
              <li>• Sie erhalten in Kürze eine Bestätigungs-E-Mail</li>
              <li>• Das Dokument ist nun rechtsverbindlich</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <button
              onClick={() => router.push('/customer/dashboard')}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-accent-primary px-5 py-3 text-xs font-semibold text-text-on-accent transition-colors hover:bg-accent-primary-hov focus:shadow-focus-ring focus:outline-none"
            >
              <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Zurück zum Dashboard</span>
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-[11px] leading-relaxed text-text-muted">
          <p>
            Wenn Sie Fragen zu diesem Prozess haben oder Unterstützung benötigen,
            wenden Sie sich bitte an unser Kundenservice-Team.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignatureSuccess() {
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
      <SuccessContent />
    </Suspense>
  );
}
