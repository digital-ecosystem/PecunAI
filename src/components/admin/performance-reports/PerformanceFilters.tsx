'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

type TimePeriod = 'week' | 'month' | 'quarter' | 'year';
type Dimension = 'all' | 'team' | 'advisor' | 'agent';

export interface FilterState {
  from: string;
  to: string;
  teamId?: string;
  partnerId?: string;
  agentId?: string;
}

export interface FilterOption {
  id: string;
  label: string;
}

export interface FilterOptions {
  teams: Array<{ id: string; name: string }>;
  advisors: Array<{ id: string; firstName: string; lastName: string; email: string }>;
  agents: Array<{ id: string; agentCode: string; firstName: string; lastName: string }>;
}

interface PerformanceFiltersProps {
  filterOptions: FilterOptions;
  onFilterChange: (filter: FilterState) => void;
}

const TIME_PRESETS: { key: TimePeriod; label: string }[] = [
  { key: 'week', label: 'Diese Woche' },
  { key: 'month', label: 'Dieser Monat' },
  { key: 'quarter', label: 'Dieses Quartal' },
  { key: 'year', label: 'Dieses Jahr' },
];

const DIMENSION_OPTIONS: { value: Dimension; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'team', label: 'Team' },
  { value: 'advisor', label: 'Berater' },
  { value: 'agent', label: 'Agent' },
];

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function computePeriodDates(period: TimePeriod): { from: string; to: string } {
  const now = new Date();
  const to = toISODate(now);
  let from: Date;

  if (period === 'week') {
    from = new Date(now);
    const day = from.getDay();
    from.setDate(from.getDate() - ((day + 6) % 7)); // Monday
  } else if (period === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'quarter') {
    const quarterStart = Math.floor(now.getMonth() / 3) * 3;
    from = new Date(now.getFullYear(), quarterStart, 1);
  } else {
    from = new Date(now.getFullYear(), 0, 1);
  }

  return { from: toISODate(from), to };
}

function buildDimensionFilter(
  dimension: Dimension,
  dimensionValue: string
): Pick<FilterState, 'teamId' | 'partnerId' | 'agentId'> {
  if (dimension === 'team' && dimensionValue) return { teamId: dimensionValue };
  if (dimension === 'advisor' && dimensionValue) return { partnerId: dimensionValue };
  if (dimension === 'agent' && dimensionValue) return { agentId: dimensionValue };
  return {};
}

export default function PerformanceFilters({ filterOptions, onFilterChange }: PerformanceFiltersProps) {
  const [activePeriod, setActivePeriod] = useState<TimePeriod | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dimension, setDimension] = useState<Dimension>('all');
  const [dimensionValue, setDimensionValue] = useState('');

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handlePeriodClick(period: TimePeriod) {
    setActivePeriod(period);
    setFromDate('');
    setToDate('');
    const dates = computePeriodDates(period);
    onFilterChange({ ...dates, ...buildDimensionFilter(dimension, dimensionValue) });
  }

  function handleFromChange(value: string) {
    setActivePeriod(null);
    setFromDate(value);
    if (value && toDate) {
      onFilterChange({ from: value, to: toDate, ...buildDimensionFilter(dimension, dimensionValue) });
    }
  }

  function handleToChange(value: string) {
    setActivePeriod(null);
    setToDate(value);
    if (fromDate && value) {
      onFilterChange({ from: fromDate, to: value, ...buildDimensionFilter(dimension, dimensionValue) });
    }
  }

  function handleDimensionChange(dim: Dimension) {
    setDimension(dim);
    setDimensionValue('');
    const dates = activePeriod
      ? computePeriodDates(activePeriod)
      : { from: fromDate, to: toDate };
    onFilterChange({ ...dates });
  }

  function handleDimensionValueChange(value: string) {
    setDimensionValue(value);
    const dates = activePeriod
      ? computePeriodDates(activePeriod)
      : { from: fromDate, to: toDate };
    onFilterChange({ ...dates, ...buildDimensionFilter(dimension, value) });
  }

  // ── Dimension value options ──────────────────────────────────────────────────

  const dimensionValueOptions: FilterOption[] =
    dimension === 'team'
      ? filterOptions.teams.map((t) => ({ id: t.id, label: t.name }))
      : dimension === 'advisor'
      ? filterOptions.advisors.map((a) => ({
          id: a.id,
          label: `${a.firstName} ${a.lastName}`,
        }))
      : dimension === 'agent'
      ? filterOptions.agents.map((a) => ({
          id: a.id,
          label: `${a.agentCode} — ${a.firstName} ${a.lastName}`,
        }))
      : [];

  return (
    /* Two distinct filter cards rather than one continuous bar (the prototype's
       `.filter-row` → two `.filter-section`s): quick ranges on the left, the
       explicit range + dimension drill-down on the right. */
    <div className="flex flex-wrap gap-3.5">

      {/* Time presets */}
      <div className="flex flex-1 basis-[260px] items-center rounded-2xl bg-surface-card px-4 py-3.5 shadow-soft">
        <div className="flex flex-1 flex-wrap gap-1.5">
          {TIME_PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePeriodClick(key)}
              aria-pressed={activePeriod === key}
              className={`flex-1 whitespace-nowrap rounded-[9px] px-3 py-1.5 text-[11px] transition-colors ${
                activePeriod === key
                  ? 'bg-accent-primary text-text-on-accent'
                  : 'bg-surface-subtle text-text-primary hover:bg-surface-selected'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Explicit date range + dimension drill-down */}
      <div className="flex flex-1 basis-[420px] flex-wrap items-center gap-2.5 rounded-2xl bg-surface-card px-4 py-3.5 shadow-soft">

        {/* Date range */}
        <div className="flex min-w-[200px] flex-1 items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => handleFromChange(e.target.value)}
            className="h-9 min-w-0 flex-1 rounded-[9px] border border-surface-raised bg-surface-card px-2.5 text-text-primary focus:outline-none focus:shadow-focus-ring"
          />
          <span className="shrink-0 text-xs text-text-muted">→</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => handleToChange(e.target.value)}
            className="h-9 min-w-0 flex-1 rounded-[9px] border border-surface-raised bg-surface-card px-2.5 text-text-primary focus:outline-none focus:shadow-focus-ring"
          />
        </div>

        {/* Dimension filter */}
        <div className="flex min-w-[200px] flex-1 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <select
              value={dimension}
              onChange={(e) => handleDimensionChange(e.target.value as Dimension)}
              className="h-9 w-full appearance-none rounded-[9px] border border-surface-raised bg-surface-card pl-3 pr-8 text-text-primary focus:outline-none focus:shadow-focus-ring"
            >
              {DIMENSION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" strokeWidth={1.75} />
          </div>

          <span className="shrink-0 text-xs text-text-muted">→</span>

          <div className="relative min-w-0 flex-1">
            <select
              value={dimensionValue}
              disabled={dimension === 'all'}
              onChange={(e) => handleDimensionValueChange(e.target.value)}
              className={`h-9 w-full appearance-none rounded-[9px] border pl-3 pr-8 focus:outline-none focus:shadow-focus-ring ${
                dimension === 'all'
                  ? 'cursor-not-allowed border-surface-raised bg-surface-subtle text-text-muted'
                  : 'border-surface-raised bg-surface-card text-text-primary'
              }`}
            >
              <option value="">{dimension === 'all' ? '—' : 'Alle auswählen…'}</option>
              {dimensionValueOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" strokeWidth={1.75} />
          </div>
        </div>

      </div>
    </div>
  );
}
