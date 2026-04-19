'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, CheckCircle, ShoppingBag, Wallet, Users } from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import KPICard from '@/components/admin/performance-reports/KPICard';
import PerformanceFilters, { FilterState, FilterOptions } from '@/components/admin/performance-reports/PerformanceFilters';
import TrendChart from '@/components/admin/performance-reports/TrendChart';
import ProductPerformance, { ProductData } from '@/components/admin/performance-reports/ProductPerformance';
import TeamRankingTable, { TeamRow } from '@/components/admin/performance-reports/TeamRankingTable';
import AdvisorRankingTable, { AdvisorRow } from '@/components/admin/performance-reports/AdvisorRankingTable';
import AgentRankingTable, { AgentRow } from '@/components/admin/performance-reports/AgentRankingTable';
import { formatVolume } from '@/components/admin/performance-reports/_shared';

// ── Types ─────────────────────────────────────────────────────────────────────

interface KPIData {
  started: number;
  completed: number;
  sold: number;
  volumeOneTime: number;
  volumeRecurring: number;
  teamCount: number;
  advisorCount: number;
  agentCount: number;
}

interface TrendPoint {
  month: string;
  started: number;
  completed: number;
  volumeOneTime: number;
  volumeRecurring: number;
}

interface RankingsData {
  teams: TeamRow[];
  advisors: AdvisorRow[];
  agents: AgentRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDefaultFilter(): FilterState {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 6);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

function buildQueryString(filter: FilterState): string {
  const params = new URLSearchParams({
    from: filter.from,
    to: filter.to,
    ...(filter.teamId ? { teamId: filter.teamId } : {}),
    ...(filter.partnerId ? { partnerId: filter.partnerId } : {}),
    ...(filter.agentId ? { agentId: filter.agentId } : {}),
  });
  return params.toString();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CompanyPerformancePage() {
  const [filter, setFilter] = useState<FilterState>(getDefaultFilter);

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    teams: [],
    advisors: [],
    agents: [],
  });

  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [trend, setTrend] = useState<TrendPoint[] | null>(null);
  const [products, setProducts] = useState<ProductData[] | null>(null);
  const [rankings, setRankings] = useState<RankingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch filter options once on mount
  useEffect(() => {
    fetch('/api/admin/performance/filter-options')
      .then((r) => r.json())
      .then((d) => { if (d.success) setFilterOptions(d.data); })
      .catch(console.error);
  }, []);

  // Fetch all dashboard data whenever the filter changes
  const fetchDashboardData = useCallback((activeFilter: FilterState) => {
    setIsLoading(true);
    const qs = buildQueryString(activeFilter);

    Promise.all([
      fetch(`/api/admin/performance/kpis?${qs}`).then((r) => r.json()),
      fetch(`/api/admin/performance/trend?${qs}`).then((r) => r.json()),
      fetch(`/api/admin/performance/products?${qs}`).then((r) => r.json()),
      fetch(`/api/admin/performance/rankings?${qs}`).then((r) => r.json()),
    ])
      .then(([kpiRes, trendRes, productsRes, rankingsRes]) => {
        if (kpiRes.success) setKpis(kpiRes.data);
        if (trendRes.success) setTrend(trendRes.data);
        if (productsRes.success) setProducts(productsRes.data);
        if (rankingsRes.success) setRankings(rankingsRes.data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetchDashboardData(filter);
  }, [filter, fetchDashboardData]);

  const handleFilterChange = useCallback((newFilter: FilterState) => {
    setFilter(newFilter);
  }, []);

  // ── Derived display values ─────────────────────────────────────────────────

  const kpiTeamsSplit = kpis ? [
    { label: 'Teams', value: `${kpis.teamCount}` },
    { label: 'Berater', value: `${kpis.advisorCount}` },
    { label: 'Agenten', value: `${kpis.agentCount}` },
  ] : undefined;

  const trendDual = trend
    ? trend.map((t) => ({ month: t.month, started: t.started, completed: t.completed }))
    : [];

  const trendVolume = trend
    ? trend.map((t) => ({ month: t.month, started: t.volumeOneTime, completed: t.volumeRecurring }))
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 space-y-6">

        {/* Filters */}
        <PerformanceFilters
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KPICard
            label="Gestartet"
            value={kpis?.started ?? '—'}
            icon={TrendingUp}
            iconBgClass="bg-blue-100"
            iconColorClass="text-blue-600"
          />
          <KPICard
            label="Abgeschlossen"
            value={kpis?.completed ?? '—'}
            icon={CheckCircle}
            iconBgClass="bg-green-100"
            iconColorClass="text-green-600"
          />
          <KPICard
            label="Verkauft"
            value={kpis?.sold ?? '—'}
            icon={ShoppingBag}
            iconBgClass="bg-emerald-100"
            iconColorClass="text-emerald-600"
          />
          <KPICard
            label="Volumen"
            splitValues={kpis ? [
              { label: 'Einmalig', value: formatVolume(kpis.volumeOneTime) },
              { label: 'Wiederk.', value: `${formatVolume(kpis.volumeRecurring)}/Mo` },
            ] : undefined}
            value={kpis ? undefined : '—'}
            icon={Wallet}
            iconBgClass="bg-purple-100"
            iconColorClass="text-purple-600"
          />
          <KPICard
            label=""
            splitValues={kpiTeamsSplit}
            value={kpis ? undefined : '—'}
            icon={Users}
            iconBgClass="bg-orange-100"
            iconColorClass="text-orange-600"
          />
        </div>

        {/* Trend Charts */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <TrendChart
            type="dual"
            title="Gestartet vs. Abgeschlossen"
            data={trendDual}
            legend1="Gestartet"
            legend2="Abgeschlossen"
          />
          <TrendChart
            type="dual"
            title="Volumen"
            data={trendVolume}
            legend1="Einmalig"
            legend2="Wiederk./Mo"
          />
        </div>

        {/* Product Performance */}
        <ProductPerformance
          products={products ?? []}
          isLoading={isLoading && products === null}
        />

        {/* Ranking Tables */}
        <TeamRankingTable
          teams={rankings?.teams ?? []}
          isLoading={isLoading && rankings === null}
        />
        <AdvisorRankingTable
          advisors={rankings?.advisors ?? []}
          isLoading={isLoading && rankings === null}
        />
        <AgentRankingTable
          agents={rankings?.agents ?? []}
          isLoading={isLoading && rankings === null}
        />

      </div>
    </div>
  );
}
