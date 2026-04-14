import React from 'react';

interface AgentRow {
  rank: number;
  code: string;
  name: string;
  cases: number;
  sold: number;
  volume: string;
}

const AGENTS: AgentRow[] = [
  { rank: 1, code: 'AB743', name: 'Alex Berger', cases: 42, sold: 28, volume: '€ 412k' },
  { rank: 2, code: 'XK291', name: 'Xenia Klein', cases: 38, sold: 24, volume: '€ 364k' },
  { rank: 3, code: 'MN582', name: 'Marco Neubert', cases: 31, sold: 19, volume: '€ 289k' },
  { rank: 4, code: 'PR904', name: 'Paula Richter', cases: 27, sold: 16, volume: '€ 241k' },
  { rank: 5, code: 'TL193', name: 'Tim Lang', cases: 22, sold: 13, volume: '€ 198k' },
];

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1
      ? 'bg-blue-600 text-white'
      : rank === 2
      ? 'bg-gray-400 text-white'
      : rank === 3
      ? 'bg-gray-300 text-gray-700'
      : 'bg-gray-100 text-gray-500';

  return (
    <div
      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold flex-shrink-0 ${cls}`}
    >
      {rank}
    </div>
  );
}

export default function AgentRankingTable() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Agenten-Rangliste</h3>
          <p className="mt-1 text-xs text-gray-500">Agenten nach Gesamtleistung im Unternehmen</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
        {/* Table header */}
        <div className="grid grid-cols-6 gap-4 border-b bg-gray-50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
          <div>Rang</div>
          <div className="col-span-2">Agent</div>
          <div>Fälle</div>
          <div>Verkauft</div>
          <div>Volumen</div>
        </div>

        {/* Rows */}
        {AGENTS.map((agent) => (
          <div
            key={agent.rank}
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
            <div className="text-sm font-medium text-gray-900">{agent.volume}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
