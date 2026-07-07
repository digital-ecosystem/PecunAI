"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignTeqIframe } from "@/components/SignTeqIframe";
import PrivacyPauseBanner from "./PrivacyPauseBanner";

type SigningPhase = "preparing" | "signing" | "success" | "failed";

interface VoiceSigningPhaseProps {
  sessionId: string;
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function RetryState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-sm text-gray-700 max-w-sm">{message}</p>
      <button
        onClick={onRetry}
        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
      >
        Signatur erneut starten
      </button>
    </div>
  );
}

function SuccessState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-green-600">Dokument erfolgreich signiert!</h3>
      <p className="text-sm sm:text-base text-gray-600 max-w-sm">
        Ihr Dokument wurde erfolgreich signiert und verarbeitet.
      </p>
      <p className="text-xs sm:text-sm text-gray-500">Weiterleitung zur Erfolgsseite...</p>
    </div>
  );
}

// Phase 7 — Signing: silent, tap-only, no AI voice at all, same treatment as Phase 3.
// Ports V1's stepper RESULT_PDF step (generatePDF / handleSigningSuccess/Error/Cancel) almost
// verbatim — the one deliberate behavior change is the retry path on cancel/error, which V1
// doesn't have (see PHASE_7_SIGNING_PLAN.md decision #4).
export default function VoiceSigningPhase({ sessionId }: VoiceSigningPhaseProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<SigningPhase>("preparing");
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startSigningSession = useCallback(async () => {
    setPhase("preparing");
    setErrorMessage(null);
    try {
      const userInfoRes = await fetch(`/api/user/info/${sessionId}`, { method: "GET" });
      const userInfoData = await userInfoRes.json();
      if (!userInfoData?.success || !userInfoData.user) {
        throw new Error(userInfoData?.message || "Failed to load user info");
      }
      const user = userInfoData.user;

      const mergeRes = await fetch("/api/documents/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, base64Encode: true }),
      });
      const mergeData = await mergeRes.json();
      if (!mergeData.success || !mergeData.mergedPdfBase64) {
        throw new Error(mergeData.error || "Failed to merge PDFs");
      }

      const sessionRes = await fetch("/api/signteq/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject:        "Dokument zur Unterschrift",
          documentBase64: mergeData.mergedPdfBase64,
          recipientEmail: user.email,
          recipientName:  `${user.firstName} ${user.lastName}`,
          sessionId,
        }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionData.success || !sessionData.signing_url) {
        throw new Error(sessionData.error || "Failed to create signing session");
      }

      setSigningUrl(sessionData.signing_url);
      setPhase("signing");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten");
      setPhase("failed");
    }
  }, [sessionId]);

  useEffect(() => {
    startSigningSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSigningSuccess = useCallback(async () => {
    setPhase("success");
    try {
      await fetch("/api/user/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      // still redirect — signing itself already completed regardless of this call
    }
    setTimeout(() => router.push("/customer/success"), 2000);
  }, [sessionId, router]);

  const handleSigningError = useCallback((message: string) => {
    setErrorMessage(message);
    setPhase("failed");
  }, []);

  const handleSigningCancel = useCallback(() => {
    setErrorMessage(null); // no error, just cancelled — different copy for this case
    setSigningUrl(null);
    setPhase("failed");
  }, []);

  return (
    <div
      className="h-[100dvh] flex flex-col"
      style={{ background: "linear-gradient(155deg, #dce8fb 0%, #edf4ff 28%, #f6faff 55%, #fdfeff 100%)" }}
    >
      <PrivacyPauseBanner />

      <div className="flex-1 flex flex-col min-h-0">
        {phase === "preparing" && <LoadingState label="Signatursitzung wird vorbereitet..." />}

        {phase === "signing" && signingUrl && (
          <div className="flex-1 flex flex-col p-4 sm:p-6 min-h-0">
            <SignTeqIframe
              src={signingUrl}
              onSuccess={handleSigningSuccess}
              onError={handleSigningError}
              onCancel={handleSigningCancel}
              className="w-full flex-1 min-h-[400px] h-full rounded-lg border border-gray-200"
            />
          </div>
        )}

        {phase === "failed" && (
          <RetryState
            message={errorMessage ?? "Der Signaturvorgang wurde abgebrochen."}
            onRetry={startSigningSession}
          />
        )}

        {phase === "success" && <SuccessState />}
      </div>
    </div>
  );
}
