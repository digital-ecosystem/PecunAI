import React from 'react';
import { SessionStatus } from '@/types';
import { cn } from '@/lib/utils';

export type StatusTone = 'pending' | 'approved' | 'flagged' | 'neutral';

/**
 * Single source of truth for status pills across customer / advisor / admin.
 * Always pairs fill + text from the same tone, so a pill can never render a
 * coloured background with a mismatched (or invisible) label colour.
 */
export const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
  pending: 'bg-status-pending text-status-pending-fg border-status-pending-border',
  approved: 'bg-status-approved text-status-approved-fg border-status-approved-border',
  flagged: 'bg-status-flagged text-status-flagged-fg border-status-flagged-border',
  neutral: 'bg-status-neutral text-status-neutral-fg border-status-neutral-border',
};

export function statusTone(status?: string | null): StatusTone {
  switch (status) {
    case SessionStatus.APPROVED:
      return 'approved';
    case SessionStatus.PENDING:
      return 'pending';
    case SessionStatus.REJECTED:
      return 'flagged';
    case SessionStatus.DRAFT:
    default:
      return 'neutral';
  }
}

export function statusLabel(status?: string | null): string {
  switch (status) {
    case SessionStatus.APPROVED:
      return 'Genehmigt';
    case SessionStatus.PENDING:
      return 'Anfrage';
    case SessionStatus.REJECTED:
      return 'Abgelehnt';
    case SessionStatus.DRAFT:
      return 'Entwurf';
    default:
      return status ? String(status).replace('_', ' ') : '';
  }
}

const SIZE_CLASSES = {
  sm: 'text-[10px] px-2.5 py-1',
  md: 'text-xs px-3 py-1.5',
} as const;

type StatusBadgeProps = {
  status?: string | null;
  /** Override the tone derived from `status`. */
  tone?: StatusTone;
  /** Override the label derived from `status`. */
  label?: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
};

export default function StatusBadge({
  status,
  tone,
  label,
  size = 'sm',
  className,
}: StatusBadgeProps) {
  const resolvedTone = tone ?? statusTone(status);
  const resolvedLabel = label ?? statusLabel(status);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border font-medium whitespace-nowrap',
        STATUS_TONE_CLASSES[resolvedTone],
        SIZE_CLASSES[size],
        className,
      )}
    >
      {resolvedLabel}
    </span>
  );
}
