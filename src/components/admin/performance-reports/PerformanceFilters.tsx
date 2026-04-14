'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

type TimePeriod = 'week' | 'month' | 'quarter' | 'year';
type Dimension = 'all' | 'team' | 'advisor' | 'agent';

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

const DIMENSION_VALUES: Record<Dimension, { value: string; label: string }[]> = {
  all: [],
  team: [
    { value: 'team-1', label: 'Team Alpha' },
    { value: 'team-2', label: 'Team Beta' },
    { value: 'team-3', label: 'Team Gamma' },
    { value: 'team-4', label: 'Team Delta' },
  ],
  advisor: [
    { value: 'adv-1', label: 'Anna Müller' },
    { value: 'adv-2', label: 'Thomas Bauer' },
    { value: 'adv-3', label: 'Sarah Weber' },
    { value: 'adv-4', label: 'Michael Fischer' },
    { value: 'adv-5', label: 'Lisa Schmidt' },
  ],
  agent: [
    { value: 'ag-1', label: 'AB743' },
    { value: 'ag-2', label: 'XK291' },
    { value: 'ag-3', label: 'MN582' },
    { value: 'ag-4', label: 'PR904' },
  ],
};

export default function PerformanceFilters() {
  const [activePeriod, setActivePeriod] = useState<TimePeriod>('month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dimension, setDimension] = useState<Dimension>('all');
  const [dimensionValue, setDimensionValue] = useState('');

  const values = DIMENSION_VALUES[dimension];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

        {/* Time presets */}
        <div className="flex flex-wrap gap-2">
          {TIME_PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActivePeriod(key)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                activePeriod === key
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Von</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 w-36 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="mb-2.5 text-sm text-gray-400">→</span>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Bis</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 w-36 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Dependent dropdown filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Ansicht nach</label>
          <div className="flex flex-wrap items-center gap-2">
            {/* Dimension selector */}
            <div className="relative">
              <select
                value={dimension}
                onChange={(e) => {
                  setDimension(e.target.value as Dimension);
                  setDimensionValue('');
                }}
                className="h-10 w-32 appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DIMENSION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>

            {/* Value selector — only shown when a dimension is chosen */}
            {dimension !== 'all' && (
              <>
                <span className="text-sm text-gray-400">→</span>
                <div className="relative">
                  <select
                    value={dimensionValue}
                    onChange={(e) => setDimensionValue(e.target.value)}
                    className="h-10 w-44 appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Alle auswählen…</option>
                    {values.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
