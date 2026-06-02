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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-3">

        {/* Time presets */}
        <div className="flex flex-wrap gap-1.5">
          {TIME_PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePeriodClick(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activePeriod === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Divider — desktop only */}
        <div className="hidden xl:block h-5 w-px shrink-0 bg-gray-200" />

        {/* Bottom controls: date + dimension, 2-col on md, stacked on mobile */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:items-center xl:gap-3">

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleFromChange(e.target.value)}
              className="h-9 flex-1 min-w-0 rounded-md border border-gray-300 px-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-400 shrink-0">→</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => handleToChange(e.target.value)}
              className="h-9 flex-1 min-w-0 rounded-md border border-gray-300 px-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Divider — desktop only */}
          <div className="hidden xl:block h-5 w-px shrink-0 bg-gray-200" />

          {/* Dimension filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <select
                value={dimension}
                onChange={(e) => handleDimensionChange(e.target.value as Dimension)}
                className="h-9 w-full appearance-none rounded-md border border-gray-300 bg-white pl-3 pr-8 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DIMENSION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>

            <span className="text-sm text-gray-400 shrink-0">→</span>

            <div className="relative flex-1 min-w-0">
              <select
                value={dimensionValue}
                disabled={dimension === 'all'}
                onChange={(e) => handleDimensionValueChange(e.target.value)}
                className={`h-9 w-full appearance-none rounded-md border pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  dimension === 'all'
                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 bg-white text-gray-700 focus:border-blue-500'
                }`}
              >
                <option value="">{dimension === 'all' ? '—' : 'Alle auswählen…'}</option>
                {dimensionValueOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
