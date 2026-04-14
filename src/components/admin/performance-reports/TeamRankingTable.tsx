import React from 'react';

interface TeamRow {
  rank: number;
  name: string;
  memberCount: number;
  lead: string;
  started: number;
  completed: number;
  sold: number;
  volume: string;
}

const TEAMS: TeamRow[] = [
  { rank: 1, name: 'Team Alpha', memberCount: 5, lead: 'Anna Müller', started: 42, completed: 31, sold: 21, volume: '€ 385k' },
  { rank: 2, name: 'Team Beta', memberCount: 4, lead: 'Thomas Bauer', started: 38, completed: 27, sold: 18, volume: '€ 298k' },
  { rank: 3, name: 'Team Gamma', memberCount: 5, lead: 'Sarah Weber', started: 35, completed: 24, sold: 16, volume: '€ 241k' },
  { rank: 4, name: 'Team Delta', memberCount: 4, lead: 'Michael Fischer', started: 19, completed: 12, sold: 8, volume: '€ 187k' },
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

export default function TeamRankingTable() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Team-Rangliste</h3>
          <p className="mt-1 text-xs text-gray-500">Teams nach Gesamtleistung im Unternehmen</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
        {/* Table header */}
        <div className="grid grid-cols-8 gap-4 border-b bg-gray-50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
          <div>Rang</div>
          <div className="col-span-2">Team</div>
          <div>Teamleiter</div>
          <div>Gestartet</div>
          <div>Abgeschlossen</div>
          <div>Verkauft</div>
          <div>Volumen</div>
        </div>

        {/* Rows */}
        {TEAMS.map((team) => (
          <div
            key={team.rank}
            className="grid grid-cols-8 gap-4 items-center border-b px-4 py-4 last:border-b-0 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <RankBadge rank={team.rank} />
            </div>

            <div className="col-span-2 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{team.name}</p>
              <p className="text-xs text-gray-500">{team.memberCount} Berater</p>
            </div>

            <div className="text-sm text-gray-700 truncate">{team.lead}</div>
            <div className="text-sm font-medium text-gray-900">{team.started}</div>
            <div className="text-sm font-medium text-gray-900">{team.completed}</div>
            <div className="text-sm font-medium text-green-600">{team.sold}</div>
            <div className="text-sm font-medium text-gray-900">{team.volume}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
