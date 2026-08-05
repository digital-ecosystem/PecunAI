"use client";

import { PhoneCall } from "lucide-react";
import Modal from "@/components/ui/Modal";

/** Shown when the customer taps a session that hit a Phase 1 compliance blocker — sustainability
 *  information or preference, insufficient disposable income, or repeated "no knowledge" on an
 *  asset class. Such a session cannot be resumed.
 *
 *  Deliberately generic: the specific reason is recorded in stepData.sessionBlocked for whoever
 *  makes the follow-up call, not repeated back to the customer.
 *  See private-documents/after-demo/SESSION_BLOCKED_STEPDATA_PLAN.md. */
export default function SessionBlockedModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Diese Beratung kann nicht fortgesetzt werden"
      onClose={onClose}
      closeOnBackdropClick
      maxWidthClassName="max-w-md"
      // Restores this modal's pre-migration `z-[100]`. The customer dashboard's
      // "start new session" welcome popup is `z-[60]` and CAN open while this one
      // is already up (autostart fires on `user` resolving, after the customer has
      // clicked a blocked row) — at the shell's default `z-50` the compliance notice
      // they asked for would be buried under it. Traced in
      // docs/fix-reports/modal-hardening-and-delete-confirm.md §1.
      zIndexClassName="z-[100]"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-accent-primary py-3 text-sm font-medium text-text-on-accent transition-colors hover:bg-accent-primary-hov"
        >
          Verstanden
        </button>
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-subtle">
          <PhoneCall className="h-7 w-7 text-accent-primary" strokeWidth={1.5} />
        </div>

        <p className="text-sm leading-relaxed text-text-muted">
          Auf Basis Ihrer Angaben ist eine persönliche Beratung erforderlich. Die digitale
          Beratung wurde daher beendet und kann nicht wieder aufgenommen werden.
        </p>

        <p className="text-sm font-medium text-text-primary">
          Einer unserer Berater wird sich in Kürze bei Ihnen melden.
        </p>
      </div>
    </Modal>
  );
}
