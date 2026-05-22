import React from 'react';

export function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1 ? 'bg-blue-600 text-white' :
    rank === 2 ? 'bg-gray-400 text-white' :
    rank === 3 ? 'bg-gray-300 text-gray-700' :
    'bg-gray-100 text-gray-500';

  return (
    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold flex-shrink-0 ${cls}`}>
      {rank}
    </div>
  );
}

export function formatVolume(v: number): string {
  if (v >= 1_000_000) return `€ ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 100_000) return `€ ${Math.round(v / 1_000)}k`;
  return `€ ${v.toLocaleString('de-AT')}`;
}
