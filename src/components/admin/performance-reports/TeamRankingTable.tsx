import React from 'react';
import {
  RankBadge,
  RankTh,
  RankingSkeleton,
  SECTION_CARD_CLASS,
  SectionEmpty,
  SectionHeading,
  formatVolume,
} from './_shared';

export interface TeamRow {
  rank: number;
  id: string;
  name: string;
  memberCount: number;
  lead: string;
  started: number;
  completed: number;
  sold: number;
  volumeOneTime: number;
  volumeRecurring: number;
}

interface TeamRankingTableProps {
  teams: TeamRow[];
  isLoading?: boolean;
}

export default function TeamRankingTable({ teams, isLoading }: TeamRankingTableProps) {
  if (isLoading) {
    return <RankingSkeleton rows={4} />;
  }

  return (
    <div className={SECTION_CARD_CLASS}>
      <SectionHeading
        title="Team-Rangliste"
        subtitle="Teams nach Gesamtleistung im Unternehmen"
        className="mb-3.5"
      />

      {teams.length === 0 ? (
        <SectionEmpty>Keine Teams für den gewählten Zeitraum</SectionEmpty>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Column headers */}
            <div className="flex border-b border-surface-raised px-1 pb-2.5">
              <RankTh className="w-[34px]">Rang</RankTh>
              <RankTh className="flex-[1.8]">Team</RankTh>
              <RankTh className="flex-[1.2]">Teamleiter</RankTh>
              <RankTh className="flex-1 text-center">Gestartet</RankTh>
              <RankTh className="flex-1 text-center">Abgeschlossen</RankTh>
              <RankTh className="flex-1 text-center">Verkauft</RankTh>
              <RankTh className="flex-[1.1] text-right">Volumen</RankTh>
            </div>

            {/* Scrollable body */}
            <div className="max-h-[280px] overflow-y-auto">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center border-b border-surface-subtle px-1 py-2.5 transition-colors last:border-b-0 hover:bg-surface-subtle"
                >
                  <div className="w-[34px]">
                    <RankBadge rank={team.rank} />
                  </div>

                  <div className="min-w-0 flex-[1.8] pr-2">
                    <p className="truncate text-xs font-semibold text-text-primary">{team.name}</p>
                    <p className="truncate text-[10px] text-text-muted">{team.memberCount} Berater</p>
                  </div>

                  <div className="flex-[1.2] truncate pr-2 text-xs text-text-muted">{team.lead}</div>
                  <div className="flex-1 text-center text-xs tabular-nums text-text-primary">{team.started}</div>
                  <div className="flex-1 text-center text-xs tabular-nums text-text-primary">{team.completed}</div>
                  <div className="flex-1 text-center text-xs font-semibold tabular-nums text-status-approved-fg">{team.sold}</div>
                  <div className="flex-[1.1] text-right">
                    <p className="text-xs tabular-nums text-text-primary">{formatVolume(team.volumeOneTime)}</p>
                    <p className="text-[10px] tabular-nums text-text-muted">{formatVolume(team.volumeRecurring)}/Mo</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
