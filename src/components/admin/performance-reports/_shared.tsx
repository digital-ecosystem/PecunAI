import React from 'react';

/**
 * Card chrome shared by every section on the performance page — the
 * prototype's `.chart-card` / `.section-card` (white surface, 16px radius,
 * soft accent-tinted elevation).
 */
export const SECTION_CARD_CLASS = 'rounded-2xl bg-surface-card p-5 shadow-soft';

export function SectionHeading({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {subtitle ? <p className="mt-0.5 text-[11px] text-text-muted">{subtitle}</p> : null}
    </div>
  );
}

/** Muted "nothing to show for this filter" line used by every section. */
export function SectionEmpty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-text-muted">{children}</p>;
}

/** Loading placeholder for the ranking sections, on the shared 1.4s cadence. */
export function RankingSkeleton({ rows }: { rows: number }) {
  return (
    <div className={SECTION_CARD_CLASS}>
      <div className="skeleton-pulse space-y-3">
        <div className="h-4 w-1/4 rounded-lg bg-surface-raised" />
        <div className="h-3 w-1/3 rounded-lg bg-surface-subtle" />
        <div className="space-y-2 pt-2">
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-surface-subtle" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Column-header cell for the ranking lists (the prototype's `.rank-th`). */
export function RankTh({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-[9px] uppercase tracking-wider text-text-muted ${className ?? ''}`}>
      {children}
    </div>
  );
}

export function RankBadge({ rank }: { rank: number }) {
  return (
    <div
      className={`flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums text-text-on-accent ${
        rank === 1 ? 'bg-accent-primary' : 'bg-text-muted'
      }`}
    >
      {rank}
    </div>
  );
}

export function formatVolume(v: number): string {
  if (v >= 1_000_000) return `€ ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 100_000) return `€ ${Math.round(v / 1_000)}k`;
  return `€ ${v.toLocaleString('de-AT')}`;
}
