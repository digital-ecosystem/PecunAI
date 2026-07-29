'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  Users,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import { exportAgentsToExcel } from '@/utils/agentExport';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';

interface Partner {
  id: string;
  firstName: string;
  lastName: string;
  referralCode: string;
}

interface AgentRow {
  id: string;
  firstName: string;
  lastName: string;
  agentCode: string;
  isActive: boolean;
  createdAt: string;
  partner: Partner;
}

type DrawerMode = 'create' | 'edit';

interface DrawerState {
  open: boolean;
  mode: DrawerMode;
  agent: AgentRow | null;
}

const EMPTY_FORM = { firstName: '', lastName: '', partnerId: '' };

/** The three status filters, lifted verbatim from the former segmented control. */
const STATUS_FILTERS = ['all', 'active', 'inactive'] as const;

const COL_HEADER_CLASS = 'text-[9px] uppercase tracking-wider text-text-muted';

/** The prototype's `.action-btn` — shared geometry, tone applied per action. */
const ACTION_BTN_CLASS =
  'whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-[11px] font-medium transition-colors focus:outline-none focus:shadow-focus-ring';

/** Shared label + field styling for the modal's fields (the 5b/Phase 6 form treatment). */
const MODAL_LABEL_CLASS = 'mb-1.5 block text-xs font-semibold text-text-primary';
const MODAL_INPUT_CLASS =
  'w-full rounded-[10px] border border-surface-raised bg-surface-card px-3 py-2.5 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring';
const MODAL_BTN_CLASS = 'rounded-[10px] px-[18px] py-2.5 text-xs font-semibold transition-colors max-sm:w-full';

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, mode: 'create', agent: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/agents');
      const data = await res.json();
      if (data.success) setAgents(data.agents);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    fetch('/api/admin/performance/filter-options')
      .then((r) => r.json())
      .then((d) => { if (d.success) setPartners(d.data.advisors); })
      .catch(console.error);
  }, [fetchAgents]);

  const filtered = agents.filter((a) => {
    const matchesSearch =
      `${a.firstName} ${a.lastName} ${a.agentCode}`.toLowerCase().includes(search.toLowerCase());
    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && a.isActive) ||
      (activeFilter === 'inactive' && !a.isActive);
    return matchesSearch && matchesActive;
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setDrawer({ open: true, mode: 'create', agent: null });
  };

  const openEdit = (agent: AgentRow) => {
    setForm({ firstName: agent.firstName, lastName: agent.lastName, partnerId: agent.partner.id });
    setFormError(null);
    setDrawer({ open: true, mode: 'edit', agent });
  };

  const closeDrawer = () => setDrawer((d) => ({ ...d, open: false }));

  const handleSave = async () => {
    setFormError(null);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.partnerId) {
      setFormError('Alle Felder sind erforderlich.');
      return;
    }
    setIsSaving(true);
    try {
      if (drawer.mode === 'create') {
        const res = await fetch('/api/admin/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!data.success) { setFormError(data.message); return; }
        setAgents((prev) => [data.agent, ...prev]);
      } else if (drawer.agent) {
        const res = await fetch(`/api/admin/agents/${drawer.agent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!data.success) { setFormError(data.message); return; }
        setAgents((prev) => prev.map((a) => a.id === data.agent.id ? data.agent : a));
      }
      closeDrawer();
    } catch {
      setFormError('Interner Fehler. Bitte erneut versuchen.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyLink = (agent: AgentRow) => {
    const url = `${window.location.origin}/?ref=${agent.partner.referralCode}&agent=${agent.agentCode}`;
    navigator.clipboard.writeText(url);
    setCopiedId(agent.id);
    setTimeout(() => setCopiedId((id) => (id === agent.id ? null : id)), 2000);
  };

  const toggleActive = async (agent: AgentRow) => {
    const res = await fetch(`/api/admin/agents/${agent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !agent.isActive }),
    });
    const data = await res.json();
    if (data.success) {
      setAgents((prev) => prev.map((a) => a.id === data.agent.id ? data.agent : a));
    }
  };

  const hasActiveFilters = search.trim() !== '' || activeFilter !== 'all';

  return (
    <AdminDashboardShell contentClassName="max-w-[1180px]">
      {/* KPI row — three flat, equal cards. Three metrics, so this reuses 5a's
          flat-row convention rather than the four-metric hard 2×2 of Phase 6:
          the prototype's own `.kpi-row-3` is `display:flex; flex-wrap:wrap` with
          `flex:1; min-width:180px`, and its 760px media query relaxes each card
          to `flex:1 1 100%` — a wrap-based composition, not a fixed grid. */}
      <div className="mb-8 flex flex-wrap gap-3">
        <StatCard
          label="Gesamt-Agenten"
          value={agents.length}
          icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
          iconClassName="bg-surface-subtle text-accent-primary"
        />
        <StatCard
          label="Aktiv"
          value={agents.filter((a) => a.isActive).length}
          icon={<UserCheck className="h-4 w-4" strokeWidth={1.75} />}
          iconClassName="bg-status-approved text-status-approved-fg"
        />
        <StatCard
          label="Inaktiv"
          value={agents.filter((a) => !a.isActive).length}
          icon={<UserMinus className="h-4 w-4" strokeWidth={1.75} />}
          iconClassName="bg-status-neutral text-status-neutral-fg"
        />
      </div>

      {/* Search · status filter · export · add agent */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-[2] min-w-[220px] max-lg:basis-full">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            strokeWidth={1.75}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name oder Code suchen…"
            className="w-full rounded-[14px] bg-surface-card py-2.5 pl-10 pr-3.5 text-xs text-text-primary shadow-soft outline-none placeholder:text-text-muted focus:shadow-focus-ring"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 max-lg:basis-full">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              aria-pressed={activeFilter === f}
              className={`rounded-xl px-3.5 py-2 text-[11px] transition-shadow max-lg:flex-1 max-lg:text-center ${activeFilter === f
                ? 'bg-accent-primary text-text-on-accent'
                : 'bg-surface-card text-text-primary shadow-soft hover:shadow-raised'
                }`}
            >
              {f === 'all' ? 'Alle' : f === 'active' ? 'Aktiv' : 'Inaktiv'}
            </button>
          ))}
        </div>

        <div className="flex gap-2.5 lg:ml-auto max-lg:basis-full">
          <button
            onClick={() => exportAgentsToExcel(agents)}
            disabled={agents.filter((agent) => agent.isActive).length === 0}
            className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-surface-card px-4 py-2.5 text-xs font-semibold text-text-primary shadow-soft transition-shadow hover:shadow-raised disabled:cursor-not-allowed disabled:opacity-40 max-lg:flex-1 max-lg:justify-center"
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
            Exportieren
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-accent-primary px-4 py-2.5 text-xs font-semibold text-text-on-accent shadow-soft transition-colors hover:bg-accent-primary-hov max-lg:flex-1 max-lg:justify-center"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Agent hinzufügen
          </button>
        </div>
      </div>

      {/* Agent list */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-[14px] bg-surface-card px-5 py-12 shadow-soft">
          <Loader2 className="h-7 w-7 animate-spin text-accent-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-[14px] bg-surface-card px-5 py-8 text-center shadow-soft">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-subtle text-accent-primary">
            <Users className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
          <div className="text-[13px] font-semibold text-text-primary">Keine Agenten gefunden</div>
          {hasActiveFilters && (
            <div className="mt-1 max-w-[280px] text-[11px] text-text-muted">
              Versuchen Sie, Ihre Such- oder Filterkriterien anzupassen.
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Column headers — the prototype's six labelled columns, hidden below
              lg where the rows reflow into its two-column card. */}
          <div className="mb-0.5 hidden items-center gap-4 px-[18px] lg:flex">
            <div className={`flex-[1.4] ${COL_HEADER_CLASS}`}>Name</div>
            <div className={`flex-[1.2] ${COL_HEADER_CLASS}`}>Code</div>
            <div className={`flex-[1.1] ${COL_HEADER_CLASS}`}>Berater</div>
            <div className={`flex-[0.7] ${COL_HEADER_CLASS}`}>Status</div>
            <div className={`flex-[0.9] ${COL_HEADER_CLASS}`}>Erstellt</div>
            <div className={`flex-[1.6] text-right ${COL_HEADER_CLASS}`} />
          </div>

          <div className="overflow-hidden rounded-[14px] bg-surface-card shadow-soft">
            {/* sm and up — the prototype's row list */}
            <div className="hidden max-h-[480px] flex-col overflow-y-auto sm:flex">
              {filtered.map((agent) => (
                <div
                  key={agent.id}
                  className="grid grid-cols-2 items-start gap-x-3.5 gap-y-2.5 border-b border-line-soft p-[18px] transition-colors last:border-b-0 hover:bg-surface-subtle lg:flex lg:items-center lg:gap-4"
                >
                  <div className="col-span-2 min-w-0 text-[13px] font-semibold text-text-primary max-lg:order-1 lg:flex-[1.4]">
                    {agent.firstName} {agent.lastName}
                  </div>

                  <div className="min-w-0 max-lg:order-2 lg:flex-[1.2]">
                    <code className="inline-block max-w-full truncate rounded-md bg-surface-raised px-2 py-1 font-mono text-[11px] text-text-primary">
                      {agent.agentCode}
                    </code>
                  </div>

                  <div className="min-w-0 truncate text-xs text-text-primary max-lg:order-4 lg:flex-[1.1]">
                    {agent.partner.firstName} {agent.partner.lastName}
                  </div>

                  <div className="max-lg:order-3 max-lg:text-right lg:flex-[0.7]">
                    <StatusBadge
                      tone={agent.isActive ? 'approved' : 'neutral'}
                      label={agent.isActive ? 'Aktiv' : 'Inaktiv'}
                    />
                  </div>

                  <div className="text-xs tabular-nums text-text-muted max-lg:order-5 max-lg:text-right lg:flex-[0.9]">
                    {new Date(agent.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>

                  <div className="col-span-2 flex flex-wrap items-center gap-1.5 max-lg:order-6 max-lg:border-t max-lg:border-line-soft max-lg:pt-2.5 lg:flex-[1.6] lg:justify-end">
                    {agent.isActive && (
                      <button
                        onClick={() => copyLink(agent)}
                        className={`${ACTION_BTN_CLASS} min-w-[84px] ${copiedId === agent.id ? 'bg-status-approved text-status-approved-fg' : 'bg-surface-selected text-accent-primary hover:bg-surface-raised'}`}
                      >
                        {copiedId === agent.id ? 'Kopiert!' : 'Link'}
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(agent)}
                      className={`${ACTION_BTN_CLASS} border border-surface-raised bg-surface-subtle text-text-primary hover:bg-surface-raised`}
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => toggleActive(agent)}
                      className={`${ACTION_BTN_CLASS} ${agent.isActive ? 'bg-status-flagged text-status-flagged-fg hover:bg-status-flagged-border' : 'bg-status-approved text-status-approved-fg hover:bg-status-approved-border'}`}
                    >
                      {agent.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile — the existing expand/collapse card list, restyled. The
                chevron and its `expandedId` state are preserved deliberately:
                they are a real interaction, and the prototype's always-visible
                mobile reflow would have removed one (see the report). */}
            <div className="max-h-[580px] overflow-y-auto sm:hidden">
              {filtered.map((agent) => (
                <div key={agent.id} className="border-b border-line-soft p-4 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-text-primary">
                        {agent.firstName} {agent.lastName}
                      </p>
                      <code className="font-mono text-[11px] text-text-muted">{agent.agentCode}</code>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <StatusBadge
                        tone={agent.isActive ? 'approved' : 'neutral'}
                        label={agent.isActive ? 'Aktiv' : 'Inaktiv'}
                      />
                      <button
                        onClick={() => setExpandedId(expandedId === agent.id ? null : agent.id)}
                        aria-expanded={expandedId === agent.id}
                        aria-label={expandedId === agent.id ? 'Details ausblenden' : 'Details anzeigen'}
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary transition-colors hover:bg-surface-raised focus:outline-none focus:shadow-focus-ring"
                      >
                        {expandedId === agent.id
                          ? <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                          : <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />}
                      </button>
                    </div>
                  </div>
                  {expandedId === agent.id && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] text-text-muted">
                        Berater: <span className="text-text-primary">{agent.partner.firstName} {agent.partner.lastName}</span>
                      </p>
                      <p className="text-[11px] text-text-muted">
                        Erstellt: <span className="tabular-nums text-text-primary">{new Date(agent.createdAt).toLocaleDateString('de-DE')}</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5 border-t border-line-soft pt-2.5">
                        {agent.isActive && (
                          <button
                            onClick={() => copyLink(agent)}
                            className={`${ACTION_BTN_CLASS} flex-1 ${copiedId === agent.id ? 'bg-status-approved text-status-approved-fg' : 'bg-surface-selected text-accent-primary'}`}
                          >
                            {copiedId === agent.id ? 'Kopiert!' : 'Link'}
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(agent)}
                          className={`${ACTION_BTN_CLASS} flex-1 border border-surface-raised bg-surface-subtle text-text-primary`}
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => toggleActive(agent)}
                          className={`${ACTION_BTN_CLASS} flex-1 ${agent.isActive ? 'bg-status-flagged text-status-flagged-fg' : 'bg-status-approved text-status-approved-fg'}`}
                        >
                          {agent.isActive ? 'Deaktivieren' : 'Aktivieren'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Count — the prototype keeps this `.list-footer` line, so it is kept */}
      {!isLoading && (
        <p className="px-[18px] pt-3 text-right text-[11px] tabular-nums text-text-muted">
          {filtered.length} von {agents.length} Agenten
        </p>
      )}

      {/* Create / edit dialog — the same dual-mode `drawer` state as before, now
          rendered through the shared `ui/Modal.tsx` shell instead of this page's
          own hand-rolled overlay. `closeOnBackdropClick` preserves the scrim
          click-to-close the hand-rolled version already had. */}
      {drawer.open && (
        <Modal
          title={drawer.mode === 'create' ? 'Neuer Agent' : 'Agent bearbeiten'}
          onClose={closeDrawer}
          closeOnBackdropClick
          maxWidthClassName="max-w-[460px]"
          footer={
            <>
              <button
                type="button"
                onClick={closeDrawer}
                className={`${MODAL_BTN_CLASS} bg-surface-subtle text-text-primary hover:bg-surface-raised`}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={`${MODAL_BTN_CLASS} bg-accent-primary text-text-on-accent hover:bg-accent-primary-hov disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {isSaving ? 'Speichern…' : 'Speichern'}
              </button>
            </>
          }
        >
          <div className="mb-[18px]">
            <label className={MODAL_LABEL_CLASS}>Vorname</label>
            <input
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              placeholder="Vorname"
              className={MODAL_INPUT_CLASS}
            />
          </div>

          <div className="mb-[18px]">
            <label className={MODAL_LABEL_CLASS}>Nachname</label>
            <input
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              placeholder="Nachname"
              className={MODAL_INPUT_CLASS}
            />
          </div>

          <div className="mb-[18px]">
            <label className={MODAL_LABEL_CLASS}>Berater</label>
            <div className="relative">
              <select
                value={form.partnerId}
                onChange={(e) => setForm((f) => ({ ...f, partnerId: e.target.value }))}
                className={`${MODAL_INPUT_CLASS} appearance-none pr-8`}
              >
                <option value="">Berater auswählen…</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.referralCode})
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                strokeWidth={1.75}
              />
            </div>
          </div>

          {drawer.mode === 'create' && (
            <p className="mb-[18px] text-[11px] text-text-muted">Der Agenten-Code wird automatisch generiert.</p>
          )}
          {drawer.mode === 'edit' && drawer.agent && (
            <div className="mb-[18px] rounded-[10px] border border-line-soft bg-surface-subtle px-4 py-3">
              <p className="mb-1 text-[11px] text-text-muted">Agenten-Code</p>
              <code className="font-mono text-[13px] font-medium text-text-primary">{drawer.agent.agentCode}</code>
            </div>
          )}
          {formError && (
            <p className="rounded-[10px] border border-status-flagged-border bg-status-flagged px-3 py-2 text-[11px] text-status-flagged-fg">
              {formError}
            </p>
          )}
        </Modal>
      )}
    </AdminDashboardShell>
  );
}

const StatCard = ({
  label,
  value,
  icon,
  iconClassName,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconClassName: string;
}) => (
  <div className="flex min-w-[180px] flex-1 items-center gap-3.5 rounded-[14px] bg-surface-card px-[18px] py-4 shadow-soft transition-shadow hover:shadow-raised max-sm:basis-full">
    <div className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className="mb-[3px] truncate text-xs text-text-muted">{label}</div>
      <div className="text-[22px] font-semibold leading-none tabular-nums text-text-primary">{value}</div>
    </div>
  </div>
);
