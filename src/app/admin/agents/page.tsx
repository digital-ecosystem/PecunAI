'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';

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

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* Toolbar */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name oder Code suchen…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
              {(['all', 'active', 'inactive'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-2 transition-colors ${activeFilter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  {f === 'all' ? 'Alle' : f === 'active' ? 'Aktiv' : 'Inaktiv'}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Agent hinzufügen
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-t-2 border-blue-500 rounded-full mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">Keine Agenten gefunden</p>
          ) : (
            <>
              <div className="hidden sm:block max-h-[560px] overflow-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {['Name', 'Code', 'Berater', 'Status', 'Erstellt', ''].map((h) => (
                        <th
                          key={h || 'actions'}
                          className="sticky top-0 z-10 bg-gray-50 px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 shadow-[inset_0_-1px_0_0_rgb(229_231_235)]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.map((agent) => (
                      <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-gray-900">
                          {agent.firstName} {agent.lastName}
                        </td>
                        <td className="px-5 py-4">
                          <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{agent.agentCode}</code>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {agent.partner.firstName} {agent.partner.lastName}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${agent.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {agent.isActive ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">
                          {new Date(agent.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            {agent.isActive && (
                              <button
                                onClick={() => copyLink(agent)}
                                className={`w-24 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors text-center ${copiedId === agent.id ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                              >
                                {copiedId === agent.id ? 'Kopiert!' : 'Link'}
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(agent)}
                              className="w-24 text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-center"
                            >
                              Bearbeiten
                            </button>
                            <button
                              onClick={() => toggleActive(agent)}
                              className={`w-24 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors text-center ${agent.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                            >
                              {agent.isActive ? 'Deaktivieren' : 'Aktivieren'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="sm:hidden max-h-[580px] divide-y divide-gray-200 overflow-y-auto">
                {filtered.map((agent) => (
                  <div key={agent.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{agent.firstName} {agent.lastName}</p>
                        <code className="text-xs font-mono text-gray-500">{agent.agentCode}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${agent.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {agent.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                        <button onClick={() => setExpandedId(expandedId === agent.id ? null : agent.id)}>
                          {expandedId === agent.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                    {expandedId === agent.id && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-gray-500">Berater: {agent.partner.firstName} {agent.partner.lastName}</p>
                        <p className="text-xs text-gray-500">Erstellt: {new Date(agent.createdAt).toLocaleDateString('de-DE')}</p>
                        <div className="flex gap-2 pt-1">
                          {agent.isActive && (
                            <button
                              onClick={() => copyLink(agent)}
                              className={`flex-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${copiedId === agent.id ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-600'}`}
                            >
                              {copiedId === agent.id ? 'Kopiert!' : 'Link'}
                            </button>
                          )}
                          <button onClick={() => openEdit(agent)} className="flex-1 text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600">
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => toggleActive(agent)}
                            className={`flex-1 text-xs px-3 py-1.5 rounded-lg font-medium ${agent.isActive ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}
                          >
                            {agent.isActive ? 'Deaktivieren' : 'Aktivieren'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Count */}
        {!isLoading && (
          <p className="mt-3 text-xs text-gray-400 text-right">
            {filtered.length} von {agents.length} Agenten
          </p>
        )}
      </div>

      {/* Drawer */}
      {drawer.open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                {drawer.mode === 'create' ? 'Neuer Agent' : 'Agent bearbeiten'}
              </h2>
              <button onClick={closeDrawer} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vorname</label>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="Vorname"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nachname</label>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="Nachname"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Berater</label>
                <select
                  value={form.partnerId}
                  onChange={(e) => setForm((f) => ({ ...f, partnerId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Berater auswählen…</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.referralCode})
                    </option>
                  ))}
                </select>
              </div>
              {drawer.mode === 'create' && (
                <p className="text-xs text-gray-400">Der Agenten-Code wird automatisch generiert.</p>
              )}
              {drawer.mode === 'edit' && drawer.agent && (
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1">Agenten-Code</p>
                  <code className="text-sm font-mono font-medium text-gray-800">{drawer.agent.agentCode}</code>
                </div>
              )}
              {formError && <p className="text-xs text-red-600">{formError}</p>}
            </div>

            {/* Drawer footer */}
            <div className="border-t px-6 py-4 flex gap-3">
              <button
                onClick={closeDrawer}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
