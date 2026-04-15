'use client';

import React from 'react';
import { TrendingUp, CheckCircle, ShoppingBag, Wallet, Users } from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import KPICard from '@/components/admin/performance-reports/KPICard';
import PerformanceFilters from '@/components/admin/performance-reports/PerformanceFilters';
import TrendChart from '@/components/admin/performance-reports/TrendChart';
import ProductPerformance from '@/components/admin/performance-reports/ProductPerformance';
import TeamRankingTable from '@/components/admin/performance-reports/TeamRankingTable';
import AdvisorRankingTable from '@/components/admin/performance-reports/AdvisorRankingTable';
import AgentRankingTable from '@/components/admin/performance-reports/AgentRankingTable';

// ── Mock data ────────────────────────────────────────────────────────────────

const TREND_DATA = [
  { month: 'Okt', started: 18, completed: 12 },
  { month: 'Nov', started: 22, completed: 16 },
  { month: 'Dez', started: 15, completed: 11 },
  { month: 'Jan', started: 28, completed: 21 },
  { month: 'Feb', started: 24, completed: 18 },
  { month: 'Mär', started: 35, completed: 27 },
  { month: 'Apr', started: 20, completed: 13 },
];

const VOLUME_DATA = [
  { month: 'Okt', value: 145000 },
  { month: 'Nov', value: 198000 },
  { month: 'Dez', value: 121000 },
  { month: 'Jan', value: 274000 },
  { month: 'Feb', value: 231000 },
  { month: 'Mär', value: 312000 },
  { month: 'Apr', value: 164000 },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CompanyPerformancePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 space-y-6">

        {/* Filters */}
        <PerformanceFilters />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KPICard
            label="Gestartet"
            value="142"
            subValue="+12% ggü. Vormonat"
            icon={TrendingUp}
            iconBgClass="bg-blue-100"
            iconColorClass="text-blue-600"
          />
          <KPICard
            label="Abgeschlossen"
            value="98"
            icon={CheckCircle}
            iconBgClass="bg-green-100"
            iconColorClass="text-green-600"
          />
          <KPICard
            label="Verkauft"
            value="67"
            icon={ShoppingBag}
            iconBgClass="bg-emerald-100"
            iconColorClass="text-emerald-600"
          />
          <KPICard
            label="Volumen"
            value="€ 1,24M"
            icon={Wallet}
            iconBgClass="bg-purple-100"
            iconColorClass="text-purple-600"
          />
          <KPICard
            label="Teams · Berater · Agenten"
            value="4 · 18 · 31"
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
            data={TREND_DATA}
            legend1="Gestartet"
            legend2="Abgeschlossen"
          />
          <TrendChart
            type="single"
            title="Volumentrend"
            data={VOLUME_DATA}
            legendLabel="Volumen"
          />
        </div>

        {/* Product Performance */}
        <ProductPerformance />

        {/* Ranking Tables */}
        <TeamRankingTable />
        <AdvisorRankingTable />
        <AgentRankingTable />

      </div>
    </div>
  );
}
