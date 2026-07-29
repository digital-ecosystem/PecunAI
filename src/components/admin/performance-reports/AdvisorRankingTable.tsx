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

export interface AdvisorRow {
  rank: number;
  id: string;
  name: string;
  email: string;
  team: string;
  started: number;
  completed: number;
  sold: number;
  volumeOneTime: number;
  volumeRecurring: number;
}

interface AdvisorRankingTableProps {
  advisors: AdvisorRow[];
  isLoading?: boolean;
}

export default function AdvisorRankingTable({ advisors, isLoading }: AdvisorRankingTableProps) {
  if (isLoading) {
    return <RankingSkeleton rows={5} />;
  }

  return (
    <div className={SECTION_CARD_CLASS}>
      <SectionHeading
        title="Berater-Rangliste"
        subtitle="Berater nach Gesamtleistung im Unternehmen"
        className="mb-3.5"
      />

      {advisors.length === 0 ? (
        <SectionEmpty>Keine Beraterdaten für den gewählten Zeitraum</SectionEmpty>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="flex border-b border-surface-raised px-1 pb-2.5">
              <RankTh className="w-[34px]">Rang</RankTh>
              <RankTh className="flex-[1.8]">Berater</RankTh>
              <RankTh className="flex-1">Team</RankTh>
              <RankTh className="flex-1 text-center">Gestartet</RankTh>
              <RankTh className="flex-1 text-center">Abgeschlossen</RankTh>
              <RankTh className="flex-1 text-center">Verkauft</RankTh>
              <RankTh className="flex-[1.1] text-right">Volumen</RankTh>
            </div>

            <div className="max-h-[280px] overflow-y-auto">
              {advisors.map((advisor) => (
                <div
                  key={advisor.id}
                  className="flex items-center border-b border-surface-subtle px-1 py-2.5 transition-colors last:border-b-0 hover:bg-surface-subtle"
                >
                  <div className="w-[34px]">
                    <RankBadge rank={advisor.rank} />
                  </div>

                  <div className="min-w-0 flex-[1.8] pr-2">
                    <p className="truncate text-xs font-semibold text-text-primary">{advisor.name}</p>
                    <p className="truncate text-[10px] text-text-muted" title={advisor.email}>{advisor.email}</p>
                  </div>

                  <div className="flex-1 truncate pr-2 text-xs text-text-muted">{advisor.team}</div>
                  <div className="flex-1 text-center text-xs tabular-nums text-text-primary">{advisor.started}</div>
                  <div className="flex-1 text-center text-xs tabular-nums text-text-primary">{advisor.completed}</div>
                  <div className="flex-1 text-center text-xs font-semibold tabular-nums text-status-approved-fg">{advisor.sold}</div>
                  <div className="flex-[1.1] text-right">
                    <p className="text-xs tabular-nums text-text-primary">{formatVolume(advisor.volumeOneTime)}</p>
                    <p className="text-[10px] tabular-nums text-text-muted">{formatVolume(advisor.volumeRecurring)}/Mo</p>
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
