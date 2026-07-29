'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Centred modal shell for the dashboard surfaces — the approved prototypes'
 * `.modal-overlay` / `.modal-box` / `.modal-header` / `.modal-body` /
 * `.modal-footer` composition, expressed in `@theme` tokens.
 *
 * **Presentational only, deliberately.** It is the same conditionally-rendered
 * overlay the admin pages already hand-rolled (no portal, no library), and it
 * adds no interaction of its own: no focus trap, no Escape handler, no scroll
 * lock, no click-outside-to-close. The caller owns openness (render it, or
 * don't) and `onClose`. Adding any of those behaviours is a feature decision,
 * not a styling one — so it is not made here.
 *
 *   {isOpen && (
 *     <Modal title="Titel" onClose={close} onSubmit={handleSubmit} footer={buttons}>
 *       ...fields...
 *     </Modal>
 *   )}
 *
 * Pass `onSubmit` when the body is a form: the body *and* the footer are then
 * wrapped in one real `<form>`, so a `type="submit"` button in the footer still
 * reaches the handler and Enter-in-field still submits, exactly as it does when
 * the buttons sit inline in the body. Omit it for read-only modals.
 */
export default function Modal({
  title,
  onClose,
  children,
  footer,
  onSubmit,
  closeLabel = 'Schließen',
  maxWidthClassName = 'max-w-[560px]',
}: {
  /** Rendered in the header, as the dialog's accessible name. */
  title: React.ReactNode;
  /** Invoked by the header's close button. */
  onClose: () => void;
  /** Modal body — scrolls when the box hits its 90vh cap. */
  children: React.ReactNode;
  /** Optional pinned footer, typically the cancel/confirm buttons. */
  footer?: React.ReactNode;
  /** When provided, body + footer are wrapped in a `<form onSubmit={...}>`. */
  onSubmit?: (event: React.FormEvent) => void;
  /** Accessible name for the close button. */
  closeLabel?: string;
  /** Overrides the box's width cap (the prototypes' 560px by default). */
  maxWidthClassName?: string;
}) {
  const titleId = React.useId();

  const body = (
    <>
      <div className="min-h-0 overflow-y-auto px-6 py-[22px]">{children}</div>
      {footer ? (
        <div className="flex flex-shrink-0 items-center justify-end gap-2.5 border-t border-surface-subtle px-6 py-4 max-sm:flex-col max-sm:items-stretch">
          {footer}
        </div>
      ) : null}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-text-primary/35 p-5 max-sm:p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'flex max-h-[90vh] w-full flex-col rounded-2xl bg-surface-card shadow-overlay',
          maxWidthClassName,
        )}
      >
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-surface-subtle px-6 py-5">
          <h2 id={titleId} className="min-w-0 text-base font-bold leading-snug text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary focus:outline-none focus:shadow-focus-ring"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
            {body}
          </form>
        ) : (
          body
        )}
      </div>
    </div>
  );
}
