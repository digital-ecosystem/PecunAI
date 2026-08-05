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
    return <RankingSkeleton rows={5} />;
  }

  return (
    <div className={SECTION_CARD_CLASS}>
      <SectionHeading
        title="Agenten-Rangliste"
        subtitle="Agenten nach Gesamtleistung im Unternehmen"
        className="mb-3.5"
      />

      {agents.length === 0 ? (
        <SectionEmpty>Keine Agentendaten für den gewählten Zeitraum</SectionEmpty>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="flex border-b border-surface-raised px-1 pb-2.5">
              <RankTh className="w-[34px]">Rang</RankTh>
              <RankTh className="flex-[1.8]">Agent</RankTh>
              <RankTh className="flex-1 text-center">Fälle</RankTh>
              <RankTh className="flex-1 text-center">Verkauft</RankTh>
              <RankTh className="flex-[1.1] text-right">Volumen</RankTh>
            </div>

            <div className="max-h-[280px] overflow-y-auto">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center border-b border-surface-subtle px-1 py-2.5 transition-colors last:border-b-0 hover:bg-surface-subtle"
                >
                  <div className="w-[34px]">
                    <RankBadge rank={agent.rank} />
                  </div>

                  <div className="min-w-0 flex-[1.8] pr-2">
                    <p className="truncate text-xs font-semibold text-text-primary">{agent.name}</p>
                    <p className="truncate font-mono text-[10px] text-text-muted">{agent.code}</p>
                  </div>

                  <div className="flex-1 text-center text-xs tabular-nums text-text-primary">{agent.cases}</div>
                  <div className="flex-1 text-center text-xs font-semibold tabular-nums text-status-approved-fg">{agent.sold}</div>
                  <div className="flex-[1.1] text-right">
                    <p className="text-xs tabular-nums text-text-primary">{formatVolume(agent.volumeOneTime)}</p>
                    <p className="text-[10px] tabular-nums text-text-muted">{formatVolume(agent.volumeRecurring)}/Mo</p>
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
