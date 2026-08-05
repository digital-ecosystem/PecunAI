'use client';

import React, { useMemo } from 'react';
import { Ban, CheckCircle, Clock, Hourglass, Users } from 'lucide-react';

type Props = {
  totalSessions: number;
  approvedSessions: number;
  draftSessions: number;
  pendingSessions: number;
  rejectedSessions: number;
};

const DIAL_RADIUS = 44;
const DIAL_CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS;
const DIAL_TICKS = Array.from({ length: 24 }, (_, i) => i * 15);

export default function DashboardStats({
  totalSessions,
  approvedSessions,
  draftSessions,
  pendingSessions,
  rejectedSessions,
}: Props) {
  const conversionRate = useMemo(() => {
    if (totalSessions === 0) return '0.0';
    return ((approvedSessions / totalSessions) * 100).toFixed(1);
  }, [approvedSessions, totalSessions]);

  const dialOffset = DIAL_CIRCUMFERENCE * (1 - Number(conversionRate) / 100);

  return (
    <div className="mb-8 flex w-full flex-wrap items-stretch gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 max-sm:basis-full max-sm:flex-row max-sm:flex-wrap">
        <StatCard
          icon={<Hourglass className="h-[18px] w-[18px] text-accent-primary" strokeWidth={1.75} />}
          value={pendingSessions}
          label="Ausstehend"
        />
        <StatCard
          icon={<Users className="h-[18px] w-[18px] text-text-primary" strokeWidth={1.75} />}
          value={totalSessions}
          label="Kunden"
        />
      </div>

      {/*
        Signature moment for the advisor surface: the conversion dial. One per surface —
        do not stack the customer dashboard's accent glow on top of this.
      */}
      <div className="flex min-w-0 flex-1 items-center justify-center rounded-2xl bg-surface-card p-3.5 shadow-soft max-sm:order-first max-sm:basis-full">
        <div className="relative h-[120px] w-[120px]">
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
            <g className="stroke-surface-raised" strokeWidth={2}>
              {DIAL_TICKS.map((angle) => (
                <line
                  key={angle}
                  x1="60"
                  y1="4"
                  x2="60"
                  y2="10"
                  transform={`rotate(${angle} 60 60)`}
                />
              ))}
            </g>
            <circle
              cx="60"
              cy="60"
              r={DIAL_RADIUS}
              fill="none"
              className="stroke-surface-subtle"
              strokeWidth={7}
            />
            <circle
              cx="60"
              cy="60"
              r={DIAL_RADIUS}
              fill="none"
              className="stroke-accent-primary"
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={DIAL_CIRCUMFERENCE}
              strokeDashoffset={dialOffset}
              transform="rotate(-90 60 60)"
            />
            <circle cx="60" cy="60" r="31" className="fill-accent-primary" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-base font-semibold leading-none tabular-nums text-text-on-accent">
              {conversionRate}%
            </div>
            <div className="mt-1 text-[9px] leading-none text-surface-selected">Konversion</div>
            <div className="mt-1 text-[8px] leading-none tabular-nums text-surface-selected/85">
              {approvedSessions} von {totalSessions}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5 max-sm:basis-full max-sm:flex-row max-sm:flex-wrap">
        {/* Desktop: Genehmigt and Abgelehnt share one card. */}
        <div className="flex flex-1 items-center gap-4 rounded-2xl bg-surface-card px-4 py-3.5 shadow-soft transition-shadow hover:shadow-raised max-sm:hidden">
          <ComboItem
            icon={
              <CheckCircle className="h-[18px] w-[18px] text-status-approved-fg" strokeWidth={1.75} />
            }
            value={approvedSessions}
            label="Genehmigt"
          />
          <div className="h-[26px] w-px flex-shrink-0 bg-surface-raised" />
          <ComboItem
            icon={<Ban className="h-[18px] w-[18px] text-status-flagged-fg" strokeWidth={1.75} />}
            value={rejectedSessions}
            label="Abgelehnt"
          />
        </div>

        {/* Mobile: the same two metrics as individual cards, matching every other KPI card. */}
        <StatCard
          className="sm:hidden"
          icon={
            <CheckCircle className="h-[18px] w-[18px] text-status-approved-fg" strokeWidth={1.75} />
          }
          value={approvedSessions}
          label="Genehmigt"
        />
        <StatCard
          className="sm:hidden"
          icon={<Ban className="h-[18px] w-[18px] text-status-flagged-fg" strokeWidth={1.75} />}
          value={rejectedSessions}
          label="Abgelehnt"
        />

        <StatCard
          icon={<Clock className="h-[18px] w-[18px] text-status-neutral-fg" strokeWidth={1.75} />}
          value={draftSessions}
          label="Entwurf"
        />
      </div>
    </div>
  );
}

const StatCard = ({
  icon,
  value,
  label,
  className = '',
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  className?: string;
}) => (
  <div
    className={`flex flex-1 items-center gap-3 rounded-2xl bg-surface-card px-4 py-3.5 shadow-soft transition-shadow hover:shadow-raised max-sm:basis-full max-sm:flex-col max-sm:gap-1.5 max-sm:text-center ${className}`}
  >
    <span className="flex-shrink-0">{icon}</span>
    <div className="max-sm:flex max-sm:flex-col max-sm:items-center">
      <div className="text-lg font-semibold leading-none tabular-nums text-text-primary">{value}</div>
      <div className="mt-1 text-[10px] text-text-muted">{label}</div>
    </div>
  </div>
);

const ComboItem = ({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) => (
  <div className="flex min-w-0 items-center gap-3">
    <span className="flex-shrink-0">{icon}</span>
    <div className="min-w-0">
      <div className="text-lg font-semibold leading-none tabular-nums text-text-primary">{value}</div>
      <div className="mt-1 truncate text-[10px] text-text-muted">{label}</div>
    </div>
  </div>
);
