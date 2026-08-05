'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';

/**
 * Destructive-confirmation dialog — the in-app replacement for a native
 * `window.confirm()` before an irreversible action.
 *
 * Built on `ui/Modal.tsx`, so it inherits the shell's focus trap, Escape-to-close
 * and scroll lock. It is deliberately **destructive-only**: the confirm button is
 * solid `status-flagged-fg`, the only red in the token system, and the icon chip is
 * the matching soft pairing. If a *non*-destructive confirm ever needs this shell,
 * add a `tone` prop then rather than styling around this one.
 *
 * Caller owns openness, exactly like `Modal`:
 *
 *   {pendingDelete && (
 *     <ConfirmDialog
 *       title="Produkt löschen"
 *       message={<>…</>}
 *       confirmLabel="Löschen"
 *       onConfirm={…}
 *       onCancel={() => setPendingDelete(null)}
 *     />
 *   )}
 *
 * `onCancel` is what the header X, the Abbrechen button, Escape and the backdrop
 * all call — i.e. every dismissal is a "no", matching `window.confirm()`'s own
 * "anything that isn't OK is cancel" contract.
 */

const BTN_CLASS = 'rounded-[10px] px-[18px] py-2.5 text-xs font-semibold transition-colors max-sm:w-full';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Abbrechen',
  onConfirm,
  onCancel,
}: {
  /** Header text, e.g. "Produkt löschen". */
  title: React.ReactNode;
  /** Body copy — what exactly is about to be destroyed. */
  message: React.ReactNode;
  /** Label of the destructive button, e.g. "Löschen". */
  confirmLabel: string;
  /** Label of the dismissing button. */
  cancelLabel?: string;
  /** The destructive action. */
  onConfirm: () => void;
  /** Every dismissal path: X, cancel button, Escape, backdrop. */
  onCancel: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      closeOnBackdropClick
      maxWidthClassName="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className={`${BTN_CLASS} bg-surface-subtle text-text-primary hover:bg-surface-raised`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`${BTN_CLASS} bg-status-flagged-fg text-text-on-accent hover:opacity-90`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-status-flagged text-status-flagged-fg">
          <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 text-[13px] leading-relaxed text-text-primary">{message}</div>
      </div>
    </Modal>
  );
}
