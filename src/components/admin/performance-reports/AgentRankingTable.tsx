import React from 'react';
import { RankBadge, formatVolume } from './_shared';

export interface AgentRow {
  rank: number;
  id: string;
  name: string;
  code: string;
  cases: number;
  sold: number;
  volumeOneTime: number;
  volumeRecurring: number;
}

interface AgentRankingTableProps {
  agents: AgentRow[];
  isLoading?: boolean;
}

export default function AgentRankingTable({ agents, isLoading }: AgentRankingTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
          <div className="mt-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Agenten-Rangliste</h3>
          <p className="mt-1 text-xs text-gray-500">Agenten nach Gesamtleistung im Unternehmen</p>
        </div>
      </div>

      {agents.length === 0 ? (
        <p className="mt-6 text-sm text-gray-400 text-center py-6">Keine Agentendaten für den gewählten Zeitraum</p>
      ) : (
        <div className="mt-5 rounded-lg border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 border-b bg-gray-50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
            <div>Rang</div>
            <div className="col-span-2">Agent</div>
            <div>Fälle</div>
            <div>Verkauft</div>
            <div>Volumen</div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="grid grid-cols-6 gap-4 items-center border-b px-4 py-4 last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <RankBadge rank={agent.rank} />
                </div>

                <div className="col-span-2 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{agent.name}</p>
                  <p className="font-mono text-xs text-gray-500">{agent.code}</p>
                </div>

                <div className="text-sm font-medium text-gray-900">{agent.cases}</div>
                <div className="text-sm font-medium text-green-600">{agent.sold}</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatVolume(agent.volumeOneTime)}</p>
                  <p className="text-xs text-gray-500">{formatVolume(agent.volumeRecurring)}/Mo</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
