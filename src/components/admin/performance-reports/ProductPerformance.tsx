'use client';

import React, { useState } from 'react';

type MetricKey = 'cases' | 'oneTime' | 'recurring';

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'cases', label: 'Fälle' },
  { key: 'oneTime', label: 'Einmalvolumen' },
  { key: 'recurring', label: 'Wiederk. Volumen' },
];

interface ProductData {
  name: string;
  shortName: string;
  cases: number;
  oneTime: number;
  recurring: number;
  approvalRate: number;
}

const PRODUCTS: ProductData[] = [
  {
    name: 'Konservativ Plus',
    shortName: 'KON+',
    cases: 38,
    oneTime: 285000,
    recurring: 124000,
    approvalRate: 92,
  },
  {
    name: 'Ausgewogen Balance',
    shortName: 'AUS',
    cases: 54,
    oneTime: 412000,
    recurring: 186000,
    approvalRate: 88,
  },
  {
    name: 'Gewinnorientiert Max',
    shortName: 'GEW',
    cases: 29,
    oneTime: 321000,
    recurring: 98000,
    approvalRate: 79,
  },
  {
    name: 'Nachhaltigkeit Pro',
    shortName: 'NAC',
    cases: 21,
    oneTime: 176000,
    recurring: 72000,
    approvalRate: 86,
  },
];

function getMetricValue(p: ProductData, metric: MetricKey): number {
  if (metric === 'cases') return p.cases;
  if (metric === 'oneTime') return p.oneTime;
  return p.recurring;
}

function formatMetricValue(p: ProductData, metric: MetricKey): string {
  if (metric === 'cases') return `${p.cases}`;
  if (metric === 'oneTime') return `€ ${(p.oneTime / 1000).toFixed(0)}k`;
  return `€ ${(p.recurring / 1000).toFixed(0)}k`;
}

function formatEuro(value: number): string {
  return `€ ${(value / 1000).toFixed(0)}k`;
}

export default function ProductPerformance() {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('cases');

  const maxValue = Math.max(...PRODUCTS.map((p) => getMetricValue(p, activeMetric)));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">

      {/* Header + toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Produktleistung</h3>
          <p className="mt-1 text-xs text-gray-500">
            Produkte nach Fällen, Einmal- oder wiederkehrendem Volumen vergleichen
          </p>
        </div>
        <div className="flex flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-1 gap-1">
          {METRICS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveMetric(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeMetric === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <div className="mt-6 flex h-40 items-end gap-4 rounded-lg bg-gray-50 px-4 pb-3 pt-4">
        {PRODUCTS.map((p) => {
          const heightPct = `${Math.round((getMetricValue(p, activeMetric) / maxValue) * 100)}%`;
          return (
            <div key={p.shortName} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-medium text-gray-600">
                {formatMetricValue(p, activeMetric)}
              </span>
              <div
                className="w-full min-h-1 rounded-t bg-blue-500 transition-all duration-300"
                style={{ height: heightPct }}
                title={p.name}
              />
            </div>
          );
        })}
      </div>

      {/* Product short-name labels */}
      <div className="mt-1 flex gap-4">
        {PRODUCTS.map((p) => (
          <div key={p.shortName} className="flex-1 text-center text-xs text-gray-400 truncate">
            {p.shortName}
          </div>
        ))}
      </div>

      {/* Per-product stat cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PRODUCTS.map((p) => (
          <div key={p.name} className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-700 truncate">{p.name}</p>
            <p className="mt-1.5 text-base font-bold text-gray-900">{p.cases} Fälle</p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Einmalig</span>
                <span className="text-xs font-medium text-gray-700">{formatEuro(p.oneTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Wiederk.</span>
                <span className="text-xs font-medium text-gray-700">{formatEuro(p.recurring)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Verkauft</span>
                <span className="text-xs font-medium text-green-600">{p.approvalRate}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
