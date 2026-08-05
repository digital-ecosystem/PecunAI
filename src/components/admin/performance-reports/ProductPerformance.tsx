'use client';

import React, { useState } from 'react';
import { formatVolume, SECTION_CARD_CLASS, SectionEmpty, SectionHeading } from './_shared';

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
      <div className={SECTION_CARD_CLASS}>
        <div className="skeleton-pulse space-y-4">
          <div className="h-4 w-1/4 rounded-lg bg-surface-raised" />
          <div className="h-3 w-1/2 rounded-lg bg-surface-subtle" />
          <div className="h-40 rounded-xl bg-surface-subtle" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-surface-subtle" />)}
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={SECTION_CARD_CLASS}>
        <h3 className="text-sm font-semibold text-text-primary">Produktleistung</h3>
        <SectionEmpty>Keine Produktdaten für den gewählten Zeitraum</SectionEmpty>
      </div>
    );
  }

  const maxValue = Math.max(...products.map((p) => getMetricValue(p, activeMetric)));

  return (
    <div className={SECTION_CARD_CLASS}>

      {/* Header + metric toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeading
          title="Produktleistung"
          subtitle="Produkte nach Fällen, Einmal- oder wiederkehrendem Volumen vergleichen"
        />
        <div className="flex flex-shrink-0 gap-1 self-start rounded-xl bg-surface-subtle p-[3px]">
          {METRICS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveMetric(key)}
              aria-pressed={activeMetric === key}
              className={`rounded-lg px-3 py-1.5 text-[11px] transition-colors ${
                activeMetric === key
                  ? 'bg-accent-primary text-text-on-accent'
                  : 'text-text-primary hover:bg-surface-selected'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bar chart — value label above each bar, product short name below */}
      <div className="mt-5 flex items-end gap-4">
        {products.map((p) => {
          const heightPct = maxValue === 0 ? '0%' : `${Math.round((getMetricValue(p, activeMetric) / maxValue) * 100)}%`;
          return (
            <div key={p.productId} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="text-[11px] text-text-muted tabular-nums">
                {formatMetricValue(p, activeMetric)}
              </div>
              <div className="flex h-[140px] w-full items-end">
                <div
                  className="min-h-1 w-full rounded-t-md bg-accent-primary transition-all duration-300"
                  style={{ height: heightPct }}
                  title={p.name}
                />
              </div>
              <div className="w-full truncate text-center text-[11px] text-text-muted">
                {p.shortName || p.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-product stat cards */}
      <div className="mt-4 flex flex-wrap gap-3">
        {products.map((p) => (
          <div key={p.productId} className="min-w-[150px] flex-1 rounded-xl bg-surface-subtle p-3.5">
            <p className="truncate text-xs font-semibold text-text-primary">{p.name}</p>
            <p className="mb-2 text-xs text-text-muted">{p.cases} Fälle</p>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-[11px] text-text-muted">
                <span>Einmalig</span>
                <span className="font-semibold tabular-nums text-text-primary">{formatVolume(p.oneTime)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2 text-[11px] text-text-muted">
                <span>Wiederk.</span>
                <span className="font-semibold tabular-nums text-text-primary">{formatVolume(p.recurring)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2 text-[11px] text-text-muted">
                <span>Verkauft</span>
                <span className="font-semibold tabular-nums text-status-approved-fg">{p.approvalRate}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
