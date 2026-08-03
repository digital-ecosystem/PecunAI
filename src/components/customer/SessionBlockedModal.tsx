"use client";

import { PhoneCall, X } from "lucide-react";

/** Shown when the customer taps a session that hit a Phase 1 compliance blocker — sustainability
 *  information or preference, insufficient disposable income, or repeated "no knowledge" on an
 *  asset class. Such a session cannot be resumed.
 *
 *  Deliberately generic: the specific reason is recorded in stepData.sessionBlocked for whoever
 *  makes the follow-up call, not repeated back to the customer.
 *  See private-documents/after-demo/SESSION_BLOCKED_STEPDATA_PLAN.md. */
export default function SessionBlockedModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md relative"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-blocked-title"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
          aria-label="Schließen"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
            <PhoneCall className="w-7 h-7 text-blue-600" strokeWidth={1.5} />
          </div>

          <h2 id="session-blocked-title" className="text-lg font-bold text-gray-900">
            Diese Beratung kann nicht fortgesetzt werden
          </h2>

          <p className="text-sm text-gray-600 leading-relaxed">
            Auf Basis Ihrer Angaben ist eine persönliche Beratung erforderlich. Die digitale
            Beratung wurde daher beendet und kann nicht wieder aufgenommen werden.
          </p>

          <p className="text-sm font-medium text-gray-800">
            Einer unserer Berater wird sich in Kürze bei Ihnen melden.
          </p>

          <button
            onClick={onClose}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl py-3 transition-colors"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}
