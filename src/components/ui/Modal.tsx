'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Centred modal shell for the dashboard surfaces — the approved prototypes'
 * `.modal-overlay` / `.modal-box` / `.modal-header` / `.modal-body` /
 * `.modal-footer` composition, expressed in `@theme` tokens.
 *
 * It is still the same conditionally-rendered overlay the admin pages hand-rolled
 * (no portal, no library): **the caller owns openness — render it, or don't — and
 * `onClose`.** What it now owns itself is the three dialog behaviours every
 * consumer needs and none of them had (punch-list item 9, closed 2026-08-04):
 *
 *   1. **Focus trap.** Focus moves into the box on open, Tab/Shift+Tab cycle
 *      inside it, and focus returns to the element that opened the dialog on
 *      close.
 *   2. **Escape-to-close.** Calls the same `onClose` the header's X button does.
 *      The listener is on `document` and stops propagation, so it does not also
 *      reach `DashboardShell`'s sidebar Escape handler on `window`.
 *   3. **Scroll lock.** The page behind cannot scroll while a modal is open;
 *      the scrollbar's width is padded back on so the page doesn't jump.
 *
 * Hand-built rather than delegated to `@radix-ui/react-dialog` / `@headlessui/react`
 * (both installed, both still imported nowhere): those bring a portal, their own
 * outside-press semantics and their own scroll-lock side effects, i.e. they would
 * change rendered DOM and dismissal behaviour for all four existing dialogs, where
 * these ~50 lines add exactly the three behaviours and nothing else.
 *
 * The one dismissal interaction that stays opt-in is `closeOnBackdropClick`:
 * it exists so a page whose hand-rolled overlay *already* closed on backdrop click
 * keeps doing so after migrating here (the agents dialog, Phase 7; SessionBlockedModal,
 * Phase 8a). Pages that never had it — the main-prompts dialogs, Phase 6 — simply
 * omit the prop and are unaffected.
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

/** Everything natively tabbable, minus the explicitly-removed and the disabled. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function Modal({
  title,
  onClose,
  children,
  footer,
  onSubmit,
  closeOnBackdropClick = false,
  closeLabel = 'Schließen',
  maxWidthClassName = 'max-w-[560px]',
  zIndexClassName = 'z-50',
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
  /**
   * Opt-in: clicking the scrim (and only the scrim, never the box) calls
   * `onClose`. Off by default — pass it only to preserve an overlay that already
   * behaved this way before it was migrated here.
   */
  closeOnBackdropClick?: boolean;
  /** Accessible name for the close button. */
  closeLabel?: string;
  /** Overrides the box's width cap (the prototypes' 560px by default). */
  maxWidthClassName?: string;
  /**
   * Overrides the scrim's stacking level (`z-50` by default — the same level as
   * `ui/drawer.tsx`, above `DashboardShell`'s `z-40` sidebar). Pass a higher one
   * only when this dialog must outrank a page-level overlay that already sits
   * above `z-50`; `SessionBlockedModal` does, because the customer dashboard's
   * `z-[60]` welcome popup can open on top of it (see the Part A trace in
   * `docs/fix-reports/modal-hardening-and-delete-confirm.md`).
   */
  zIndexClassName?: string;
}) {
  const titleId = React.useId();
  const boxRef = React.useRef<HTMLDivElement>(null);

  // Consumers pass `onClose` as an inline arrow, so its identity changes every
  // render. Read it through a ref so the trap effect below can run exactly once
  // per open — re-running it would re-steal focus mid-interaction.
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  // Scroll lock. Padding the scrollbar's width back on keeps the page behind
  // from shifting sideways as it loses its scrollbar.
  React.useEffect(() => {
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, []);

  // Focus trap + Escape-to-close.
  React.useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        // Skip anything not actually rendered (a hidden branch of a mode-switching body).
        .filter((element) => element.getClientRects().length > 0);

    // Focus the box itself rather than its first control: that is the header's
    // close button in every consumer, and it keeps mobile keyboards from opening
    // on a form dialog. `aria-labelledby` means screen readers announce the title.
    box.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Stops `DashboardShell`'s window-level sidebar Escape handler from also firing.
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      const active = document.activeElement;

      // Focus outside the box (e.g. after a backdrop click dropped it on <body>)
      // or on the box itself — pull the next Tab back to an end of the cycle.
      if (items.length === 0) {
        event.preventDefault();
        box.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const isInside = active instanceof Node && box.contains(active) && active !== box;

      if (event.shiftKey) {
        if (!isInside || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!isInside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Return focus to whatever opened the dialog, unless that element is gone
      // (a row that re-rendered away underneath it).
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, []);

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
    <div
      onClick={
        closeOnBackdropClick
          ? (event) => { if (event.target === event.currentTarget) onClose(); }
          : undefined
      }
      className={cn(
        'fixed inset-0 flex items-center justify-center overflow-y-auto bg-text-primary/35 p-5 max-sm:p-3',
        zIndexClassName,
      )}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // Programmatically focusable so the trap can park focus on the dialog itself;
        // `outline-none` keeps that from drawing a ring around the whole box.
        tabIndex={-1}
        className={cn(
          'flex max-h-[90vh] w-full flex-col rounded-2xl bg-surface-card shadow-overlay outline-none',
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
