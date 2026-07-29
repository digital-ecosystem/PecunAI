'use client';

import React from 'react';
import { Search, Users } from 'lucide-react';
import { Session } from '@/types';
import StatusBadge from '@/components/ui/StatusBadge';

type Props = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  filteredSessions: Session[];
  totalSessions: number;
  formatDate: (dateString: string) => string;
  onRowClick: (sessionId: string) => void;
};

// Same five values, same order as the <select> this replaces.
const STATUS_FILTERS = [
  { value: 'all', label: 'Alle' },
  { value: 'DRAFT', label: 'Entwurf' },
  { value: 'PENDING', label: 'Ausstehend' },
  { value: 'REJECTED', label: 'Abgelehnt' },
  { value: 'APPROVED', label: 'Genehmigt' },
];

export default function SessionsTable({
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  filteredSessions,
  totalSessions,
  formatDate,
  onRowClick,
}: Props) {
  return (
    <div>
      <div className="mb-3 text-[15px] font-semibold text-text-primary">Ihre Kunden</div>

      {/* Search + status filter — always visible, independent of the list below. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 max-sm:flex-col max-sm:items-stretch">
        <div className="relative min-w-[200px] max-sm:w-full max-sm:min-w-0">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            strokeWidth={1.75}
          />
          <input
            type="text"
            placeholder="Kunde suchen..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="w-full rounded-2xl bg-surface-card py-2.5 pl-10 pr-3.5 text-xs text-text-primary shadow-soft placeholder:text-text-muted focus:outline-none focus:shadow-focus-ring"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 max-sm:w-full">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusFilterChange(option.value)}
              aria-pressed={statusFilter === option.value}
              className={`rounded-xl px-3 py-1.5 text-[10px] transition-shadow max-sm:flex-1 max-sm:text-center ${
                statusFilter === option.value
                  ? 'bg-accent-primary text-text-on-accent'
                  : 'bg-surface-card text-text-primary shadow-soft hover:shadow-raised'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        totalSessions === 0 ? (
          <StatePanel
            icon={<Users className="h-[18px] w-[18px]" strokeWidth={1.75} />}
            iconClassName="bg-surface-subtle text-accent-primary"
            title="Noch keine Kunden"
            description="Sie haben noch keine Kunden. Teilen Sie Ihren Empfehlungslink, um zu beginnen!"
          />
        ) : (
          <StatePanel
            icon={<Search className="h-[18px] w-[18px]" strokeWidth={1.75} />}
            iconClassName="bg-surface-subtle text-accent-primary"
            title="Keine Ergebnisse"
            description="Keine Kunden gefunden, die Ihren Kriterien entsprechen."
          />
        )
      ) : (
        <div>
          <div className="mb-1.5 hidden px-3.5 sm:flex">
            <div className="flex-[2.2] text-[9px] tracking-wider text-text-muted">KUNDE</div>
            <div className="flex-1 text-[9px] tracking-wider text-text-muted">STATUS</div>
            <div className="flex-1 text-right text-[9px] tracking-wider text-text-muted">ERSTELLT</div>
          </div>

          <div className="flex flex-col gap-2">
            {filteredSessions.map((session) => {
              const firstName = session?.personalInfo?.firstName;
              const lastName = session?.personalInfo?.lastName;
              const hasName = Boolean(firstName && lastName);
              const displayName = hasName ? `${firstName} ${lastName}` : 'Unbekannt';
              const initial = (hasName ? displayName : session.user.email)
                .trim()
                .charAt(0)
                .toUpperCase();

              return (
                <div
                  key={session.id}
                  onClick={() => onRowClick(session.id)}
                  className="flex cursor-pointer items-center gap-x-2.5 gap-y-1.5 rounded-2xl bg-surface-card p-3.5 shadow-soft transition-shadow hover:shadow-raised max-sm:flex-wrap"
                >
                  <div className="flex min-w-0 flex-[2.2] items-center gap-2.5 max-sm:basis-full">
                    <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-surface-subtle text-[10px] font-semibold text-accent-primary">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-text-primary">
                        {displayName}
                      </div>
                      <div className="truncate text-[11px] text-text-muted" title={session.user.email}>
                        {session.user.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 max-sm:order-4 max-sm:flex-none">
                    <StatusBadge status={session.status} />
                  </div>
                  <div className="flex-1 text-right text-[10px] text-text-muted max-sm:order-5 max-sm:flex-1">
                    {formatDate(session.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const StatePanel = ({
  icon,
  iconClassName,
  title,
  description,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-center rounded-2xl bg-surface-card px-5 py-8 text-center shadow-soft">
    <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${iconClassName}`}>
      {icon}
    </div>
    <div className="mb-1 text-[13px] font-semibold text-text-primary">{title}</div>
    <div className="max-w-[320px] text-[11px] text-text-muted">{description}</div>
  </div>
);
