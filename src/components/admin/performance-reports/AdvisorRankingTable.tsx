import React from 'react';

interface AdvisorRow {
  rank: number;
  name: string;
  email: string;
  team: string;
  started: number;
  completed: number;
  sold: number;
  volume: string;
}

const ADVISORS: AdvisorRow[] = [
  { rank: 1, name: 'Anna Müller', email: 'a.mueller@4money.at', team: 'Team Alpha', started: 18, completed: 14, sold: 9, volume: '€ 165k' },
  { rank: 2, name: 'Thomas Bauer', email: 't.bauer@4money.at', team: 'Team Beta', started: 15, completed: 12, sold: 8, volume: '€ 148k' },
  { rank: 3, name: 'Sarah Weber', email: 's.weber@4money.at', team: 'Team Gamma', started: 14, completed: 10, sold: 7, volume: '€ 134k' },
  { rank: 4, name: 'Michael Fischer', email: 'm.fischer@4money.at', team: 'Team Delta', started: 12, completed: 9, sold: 6, volume: '€ 112k' },
  { rank: 5, name: 'Lisa Schmidt', email: 'l.schmidt@4money.at', team: 'Team Alpha', started: 11, completed: 8, sold: 5, volume: '€ 98k' },
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

export default function AdvisorRankingTable() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Berater-Rangliste</h3>
          <p className="mt-1 text-xs text-gray-500">Berater nach Gesamtleistung im Unternehmen</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
        {/* Table header */}
        <div className="grid grid-cols-8 gap-4 border-b bg-gray-50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
          <div>Rang</div>
          <div className="col-span-2">Berater</div>
          <div>Team</div>
          <div>Gestartet</div>
          <div>Abgeschlossen</div>
          <div>Verkauft</div>
          <div>Volumen</div>
        </div>

        {/* Rows */}
        {ADVISORS.map((advisor) => (
          <div
            key={advisor.rank}
            className="grid grid-cols-8 gap-4 items-center border-b px-4 py-4 last:border-b-0 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <RankBadge rank={advisor.rank} />
            </div>

            <div className="col-span-2 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{advisor.name}</p>
              <p className="text-xs text-gray-500 truncate">{advisor.email}</p>
            </div>

            <div className="text-sm text-gray-700 truncate">{advisor.team}</div>
            <div className="text-sm font-medium text-gray-900">{advisor.started}</div>
            <div className="text-sm font-medium text-gray-900">{advisor.completed}</div>
            <div className="text-sm font-medium text-green-600">{advisor.sold}</div>
            <div className="text-sm font-medium text-gray-900">{advisor.volume}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
