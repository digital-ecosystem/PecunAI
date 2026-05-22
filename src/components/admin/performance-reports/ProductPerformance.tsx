'use client';

import React, { useState } from 'react';
import { formatVolume } from './_shared';

type MetricKey = 'cases' | 'oneTime' | 'recurring';

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'cases', label: 'Fälle' },
  { key: 'oneTime', label: 'Einmalvolumen' },
  { key: 'recurring', label: 'Wiederk. Volumen' },
];

export interface ProductData {
  productId: string;
  name: string;
  shortName: string;
  cases: number;
  oneTime: number;
  recurring: number;
  approvalRate: number;
}

interface ProductPerformanceProps {
  products: ProductData[];
  isLoading?: boolean;
}

function getMetricValue(p: ProductData, metric: MetricKey): number {
  if (metric === 'cases') return p.cases;
  if (metric === 'oneTime') return p.oneTime;
  return p.recurring;
}

function formatMetricValue(p: ProductData, metric: MetricKey): string {
  if (metric === 'cases') return `${p.cases}`;
  if (metric === 'oneTime') return formatVolume(p.oneTime);
  return formatVolume(p.recurring);
}

export default function ProductPerformance({ products, isLoading }: ProductPerformanceProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('cases');

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
          <div className="h-40 bg-gray-100 rounded" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800">Produktleistung</h3>
        <p className="mt-4 text-sm text-gray-400 text-center py-8">Keine Produktdaten für den gewählten Zeitraum</p>
      </div>
    );
  }

  const maxValue = Math.max(...products.map((p) => getMetricValue(p, activeMetric)));

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

      {/* Value labels above bars */}
      <div className="mt-6 flex gap-4 px-4">
        {products.map((p) => (
          <div key={p.productId} className="flex-1 text-center text-xs font-medium text-gray-600">
            {formatMetricValue(p, activeMetric)}
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="mt-1 flex h-40 items-end gap-4 rounded-lg bg-gray-50 px-4 pb-3 pt-2">
        {products.map((p) => {
          const heightPct = maxValue === 0 ? '0%' : `${Math.round((getMetricValue(p, activeMetric) / maxValue) * 100)}%`;
          return (
            <div key={p.productId} className="flex flex-1 h-full items-end justify-center">
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
        {products.map((p) => (
          <div key={p.productId} className="flex-1 text-center text-xs text-gray-400 truncate">
            {p.shortName || p.name}
          </div>
        ))}
      </div>

      {/* Per-product stat cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {products.map((p) => (
          <div key={p.productId} className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-700 truncate">{p.name}</p>
            <p className="mt-1.5 text-base font-bold text-gray-900">{p.cases} Fälle</p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Einmalig</span>
                <span className="text-xs font-medium text-gray-700">{formatVolume(p.oneTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Wiederk.</span>
                <span className="text-xs font-medium text-gray-700">{formatVolume(p.recurring)}</span>
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
