'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Edit,
  // Trash2, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Calendar,
  Bot,
  Eye,
  Loader2,
  Link
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';
import Modal from '@/components/ui/Modal';

interface MainProductPrompt {
  id: string;
  vectorId: string | null;
  aiModel: string;
  mcpUrl: string | null;
  mainPrompt: string;
  createdAt: string;
  updatedAt: string;
}

interface MainProductPromptFormData {
  vectorId: string;
  aiModel: string;
  mcpUrl: string;
  mainPrompt: string;
}

const ICON_BTN_CLASS =
  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary transition-colors hover:bg-surface-raised focus:outline-none focus:shadow-focus-ring disabled:opacity-50 disabled:cursor-not-allowed';

const COL_HEADER_CLASS = 'text-[9px] uppercase tracking-wider text-text-muted';

/**
 * Every KI-model pill carries the decorative `violet` chip tone the approved
 * design specifies for AI-model contexts — one treatment for all models, as in
 * the prototype. The model id is the pill's own text, so no information rides
 * on the colour.
 */
const MODEL_PILL_CLASS =
  'inline-block rounded-lg bg-violet px-2.5 py-1 text-[10px] font-semibold text-violet-fg';

/** Shared label + field styling for the modal's fields (the 5b form treatment). */
const MODAL_LABEL_CLASS = 'mb-1.5 block text-xs font-semibold text-text-primary';
const MODAL_VALUE_CLASS = 'text-[12.5px] text-text-primary';
const MODAL_INPUT_CLASS =
  'w-full rounded-[10px] border bg-surface-card px-3 py-2.5 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring';
const MODAL_BTN_CLASS = 'rounded-[10px] px-[18px] py-2.5 text-xs font-semibold transition-colors max-sm:w-full';

const MainProductPromptPage = () => {
  const [mainProductPrompts, setMainProductPrompts] = useState<MainProductPrompt[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedPrompt, setSelectedPrompt] = useState<MainProductPrompt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  const [formData, setFormData] = useState<MainProductPromptFormData>({
    vectorId: '',
    aiModel: 'gpt-5',
    mcpUrl: '',
    mainPrompt: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch main product prompts
  const fetchMainProductPrompts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
      });

      const response = await fetch(`/api/admin/main-product-prompt?${params}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setMainProductPrompts(data.data.mainProductPrompts);
        setTotalPages(data.data.pagination.totalPages);
        setTotalCount(data.data.pagination.totalCount);
      } else {
        if (response.status === 401) {
          router.push('/admin/signin');
        }
        console.error('Failed to fetch main product prompts:', data.error);
      }
    } catch (error) {
      console.error('Error fetching main product prompts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, router]);

  useEffect(() => {
    fetchMainProductPrompts();
  }, [fetchMainProductPrompts]);

  // Handle search with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Reset form
  const resetForm = () => {
    setFormData({
      vectorId: '',
      aiModel: 'gpt-5',
      mcpUrl: '',
      mainPrompt: '',
    });
    setErrors({});
  };

  // Open modal for create
  const handleCreate = () => {
    resetForm();
    setModalMode('create');
    setSelectedPrompt(null);
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleEdit = (prompt: MainProductPrompt) => {
    setFormData({
      vectorId: prompt.vectorId || '',
      aiModel: prompt.aiModel,
      mcpUrl: prompt.mcpUrl || '',
      mainPrompt: prompt.mainPrompt,
    });
    setModalMode('edit');
    setSelectedPrompt(prompt);
    setErrors({});
    setIsModalOpen(true);
  };

  // Open modal for view
  const handleView = (prompt: MainProductPrompt) => {
    setSelectedPrompt(prompt);
    setModalMode('view');
    setIsModalOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const url = modalMode === 'create'
        ? '/api/admin/main-product-prompt'
        : `/api/admin/main-product-prompt/${selectedPrompt?.id}`;

      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setIsModalOpen(false);
        resetForm();
        fetchMainProductPrompts();
      } else {
        if (data.details) {
          const fieldErrors: Record<string, string> = {};
          data.details.forEach((validationError: { path: string[]; message: string }) => {
            fieldErrors[validationError.path[0]] = validationError.message;
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ general: data.error });
        }
      }
    } catch (submitError) {
      console.error('Submit error:', submitError);
      setErrors({ general: 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  // const handleDelete = async (prompt: MainProductPrompt) => {
  //   if (!confirm(`Are you sure you want to delete this main product prompt?`)) {
  //     return;
  //   }

  //   try {
  //     const response = await fetch(`/api/admin/main-product-prompt/${prompt.id}`, {
  //       method: 'DELETE',
  //       credentials: 'include',
  //     });

  //     const data = await response.json();

  //     if (data.success) {
  //       fetchMainProductPrompts();
  //     } else {
  //       alert(data.error);
  //     }
  //   } catch (deleteError) {
  //     console.error('Delete error:', deleteError);
  //     alert('Failed to delete main product prompt');
  //   }
  // };

  const hasActiveFilters = searchTerm.trim() !== '';

  return (
    <AdminDashboardShell contentClassName="max-w-[1180px]">
      {/* KPI row — four flat, equal cards. Four metrics, so no focal hero (that
          composition only reads as intentional with five); the cards wrap into
          the prototype's 2x2 grid below ~800px. */}
      <div className="mb-8 flex flex-wrap gap-3">
        <StatCard
          label="Gesamt-Prompts"
          value={totalCount}
          icon={<MessageSquare className="h-4 w-4" strokeWidth={1.75} />}
          iconClassName="bg-surface-subtle text-accent-primary"
        />
        <StatCard
          label="GPT-5 Modelle"
          value={mainProductPrompts.filter(p => p.aiModel === 'gpt-5').length}
          icon={<Bot className="h-4 w-4" strokeWidth={1.75} />}
          iconClassName="bg-violet text-violet-fg"
        />
        <StatCard
          label="Mit MCP-URL"
          value={mainProductPrompts.filter(p => p.mcpUrl).length}
          icon={<Link className="h-4 w-4" strokeWidth={1.75} />}
          iconClassName="bg-status-approved text-status-approved-fg"
        />
        <StatCard
          label="Diesen Monat"
          value={mainProductPrompts.filter(p => {
            const promptDate = new Date(p.createdAt);
            const now = new Date();
            return promptDate.getMonth() === now.getMonth() &&
              promptDate.getFullYear() === now.getFullYear();
          }).length}
          icon={<Calendar className="h-4 w-4" strokeWidth={1.75} />}
          iconClassName="bg-risk-growth text-risk-growth-fg"
        />
      </div>

      {/* Search */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            strokeWidth={1.75}
          />
          <input
            type="text"
            placeholder="Prompts suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-[14px] bg-surface-card py-2.5 pl-10 pr-3.5 text-xs text-text-primary shadow-soft outline-none placeholder:text-text-muted focus:shadow-focus-ring"
          />
        </div>

        {/* Add Prompt Button */}
        {/* <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Add Prompt</span>
          <span className="sm:hidden">Add</span>
        </button> */}
      </div>

      {/* Prompts list */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-[14px] bg-surface-card px-5 py-12 shadow-soft">
          <Loader2 className="h-7 w-7 animate-spin text-accent-primary" />
        </div>
      ) : mainProductPrompts.length === 0 ? (
        <div className="flex flex-col items-center rounded-[14px] bg-surface-card px-5 py-8 text-center shadow-soft">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-subtle text-accent-primary">
            <MessageSquare className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
          <div className="mb-1 text-[13px] font-semibold text-text-primary">Keine Prompts gefunden</div>
          <div className="mb-4 max-w-[280px] text-[11px] text-text-muted">
            {hasActiveFilters
              ? 'Versuchen Sie einen anderen Suchbegriff.'
              : 'Beginnen Sie mit der Erstellung Ihres ersten Hauptprodukt-Prompts'}
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2.5 text-xs font-semibold text-text-on-accent shadow-soft transition-colors hover:bg-accent-primary-hov"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Prompt hinzufügen
          </button>
        </div>
      ) : (
        <>
          {/* Column headers — six labelled columns, hidden below md where the
              rows reflow into two-column cards. */}
          <div className="mb-0.5 hidden items-center gap-4 px-[18px] md:flex">
            <div className={`flex-[0.9] ${COL_HEADER_CLASS}`}>KI-Modell</div>
            <div className={`flex-[1.1] ${COL_HEADER_CLASS}`}>Vektor-ID</div>
            <div className={`flex-1 ${COL_HEADER_CLASS}`}>MCP-URL</div>
            <div className={`min-w-[200px] flex-[2.4] ${COL_HEADER_CLASS}`}>Prompt-Vorschau</div>
            <div className={`flex-[0.8] ${COL_HEADER_CLASS}`}>Erstellt</div>
            <div className={`flex-[0.6] text-right ${COL_HEADER_CLASS}`}>Aktionen</div>
          </div>

          <div className="flex flex-col gap-2.5">
            {mainProductPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="grid grid-cols-2 items-start gap-x-3.5 gap-y-2.5 rounded-[14px] bg-surface-card p-[18px] shadow-soft transition-shadow hover:shadow-raised md:flex md:items-center md:gap-4"
              >
                <div className="md:flex-[0.9]">
                  <span className={MODEL_PILL_CLASS}>
                    {prompt.aiModel}
                  </span>
                </div>

                <div className="min-w-0 md:flex-[1.1]">
                  {prompt.vectorId ? (
                    <span
                      className="inline-block max-w-full truncate rounded-md bg-surface-subtle px-2 py-1 font-mono text-[11px] text-text-primary"
                      title={prompt.vectorId}
                    >
                      {prompt.vectorId.length > 15 ? `${prompt.vectorId.substring(0, 15)}...` : prompt.vectorId}
                    </span>
                  ) : (
                    <span className="text-[11px] text-text-muted">—</span>
                  )}
                </div>

                <div className="min-w-0 md:flex-1">
                  {prompt.mcpUrl ? (
                    <a
                      href={prompt.mcpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] text-accent-primary transition-colors hover:text-accent-primary-hov"
                    >
                      <Link className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
                      <span className="hidden xl:inline">MCP-Link</span>
                      <span className="xl:hidden">Link</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-text-muted">Keine URL</span>
                  )}
                </div>

                <div className="col-span-2 rounded-[10px] max-md:order-5 max-md:bg-surface-subtle max-md:px-2.5 max-md:py-2 md:min-w-[200px] md:flex-[2.4]">
                  <div
                    className="line-clamp-2 text-[11.5px] leading-relaxed text-text-muted"
                    title={prompt.mainPrompt}
                  >
                    {prompt.mainPrompt.length > 80
                      ? `${prompt.mainPrompt.substring(0, 80)}...`
                      : prompt.mainPrompt}
                  </div>
                </div>

                <div className="text-[11px] tabular-nums text-text-muted max-md:order-4 max-md:text-right md:flex-[0.8]">
                  {new Date(prompt.createdAt).toLocaleDateString()}
                </div>

                <div className="col-span-2 flex items-center gap-1.5 max-md:order-6 max-md:border-t max-md:border-line-soft max-md:pt-2.5 md:flex-[0.6] md:justify-end">
                  <button
                    onClick={() => handleView(prompt)}
                    className={ICON_BTN_CLASS}
                    title="View Details"
                  >
                    <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => handleEdit(prompt)}
                    className={ICON_BTN_CLASS}
                    title="Edit Prompt"
                  >
                    <Edit className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                  {/* <button
                    onClick={() => handleDelete(prompt)}
                    className="p-1.5 sm:p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Prompt"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button> */}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-2.5 flex items-center justify-center gap-2 rounded-[14px] bg-surface-card px-[18px] py-3 shadow-soft">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                aria-label="Vorherige Seite"
                className={ICON_BTN_CLASS}
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <span className="px-2 text-[11px] font-medium tabular-nums text-text-primary">
                {currentPage} von {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                aria-label="Nächste Seite"
                className={ICON_BTN_CLASS}
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal — one shell, the same three modes as before: view (read-only, no
          footer) and create/edit (the form, submitted from the footer). */}
      {isModalOpen && (
        <Modal
          title={
            <>
              {modalMode === 'create' && 'Neuen Hauptprodukt-Prompt hinzufügen'}
              {modalMode === 'edit' && 'Hauptprodukt-Prompt bearbeiten'}
              {modalMode === 'view' && 'Hauptprodukt-Prompt Details'}
            </>
          }
          onClose={() => setIsModalOpen(false)}
          onSubmit={modalMode === 'view' ? undefined : handleSubmit}
          footer={
            modalMode === 'view' ? undefined : (
              <>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`${MODAL_BTN_CLASS} bg-surface-subtle text-text-primary hover:bg-surface-raised`}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${MODAL_BTN_CLASS} flex items-center justify-center gap-2 bg-accent-primary text-text-on-accent hover:bg-accent-primary-hov disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                      <span className="hidden sm:inline">{modalMode === 'create' ? 'Erstellen...' : 'Aktualisieren...'}</span>
                      <span className="sm:hidden">{modalMode === 'create' ? 'Erstellen' : 'Aktualisieren'}</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">{modalMode === 'create' ? 'Prompt erstellen' : 'Prompt aktualisieren'}</span>
                      <span className="sm:hidden">{modalMode === 'create' ? 'Erstellen' : 'Aktualisieren'}</span>
                    </>
                  )}
                </button>
              </>
            )
          }
        >
          {modalMode === 'view' ? (
            // View Mode
            <>
              <div className="mb-[18px] flex flex-wrap gap-6">
                <div className="min-w-[180px] flex-1">
                  <div className={MODAL_LABEL_CLASS}>KI-Modell</div>
                  <span className={MODEL_PILL_CLASS}>
                    {selectedPrompt?.aiModel}
                  </span>
                </div>
                <div className="min-w-[180px] flex-1">
                  <div className={MODAL_LABEL_CLASS}>Vektor-ID</div>
                  <div className={`${MODAL_VALUE_CLASS} break-all font-mono`}>
                    {selectedPrompt?.vectorId || '—'}
                  </div>
                </div>
              </div>

              <div className="mb-[18px]">
                <div className={MODAL_LABEL_CLASS}>MCP-URL</div>
                {selectedPrompt?.mcpUrl ? (
                  <a
                    href={selectedPrompt.mcpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-2 break-all font-mono text-[12.5px] text-accent-primary transition-colors hover:text-accent-primary-hov"
                  >
                    <Link className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{selectedPrompt.mcpUrl}</span>
                  </a>
                ) : (
                  <div className="text-[12.5px] text-text-muted">Keine MCP-URL</div>
                )}
              </div>

              <div className="mb-[18px]">
                <div className={MODAL_LABEL_CLASS}>Haupt-Prompt</div>
                <div className="max-h-[220px] overflow-y-auto whitespace-pre-wrap rounded-[10px] bg-surface-subtle px-4 py-3.5 font-mono text-[11.5px] leading-relaxed text-text-primary">
                  {selectedPrompt?.mainPrompt}
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="min-w-[180px] flex-1">
                  <div className={MODAL_LABEL_CLASS}>Erstellungsdatum</div>
                  <div className={`${MODAL_VALUE_CLASS} tabular-nums`}>
                    {selectedPrompt ? new Date(selectedPrompt.createdAt).toLocaleDateString() : '—'}
                  </div>
                </div>
                <div className="min-w-[180px] flex-1">
                  <div className={MODAL_LABEL_CLASS}>Zuletzt aktualisiert</div>
                  <div className={`${MODAL_VALUE_CLASS} tabular-nums`}>
                    {selectedPrompt ? new Date(selectedPrompt.updatedAt).toLocaleDateString() : '—'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Create/Edit Mode
            <>
              {errors.general && (
                <div className="mb-[18px] rounded-[10px] border border-status-flagged-border bg-status-flagged px-3.5 py-3 text-xs text-status-flagged-fg">
                  {errors.general}
                </div>
              )}

              <div className="mb-[18px] flex flex-wrap gap-[18px]">
                <div className="min-w-[180px] flex-1">
                  <label className={MODAL_LABEL_CLASS}>
                    KI-Modell <span className="text-accent-primary">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.aiModel}
                      onChange={(e) => setFormData(prev => ({ ...prev, aiModel: e.target.value }))}
                      className={`${MODAL_INPUT_CLASS} appearance-none pr-8 ${errors.aiModel ? 'border-status-flagged-border' : 'border-surface-raised'}`}
                    >
                      <option value="gpt-5.2">GPT-5.2</option>
                      <option value="gpt-5">GPT-5</option>
                      <option value="gpt-5-mini">GPT-5-mini</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                      <option value="claude-3-haiku">Claude 3 Haiku</option>
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
                      strokeWidth={1.75}
                    />
                  </div>
                  {errors.aiModel && <div className="mt-1 text-xs text-status-flagged-fg">{errors.aiModel}</div>}
                </div>

                <div className="min-w-[180px] flex-1">
                  <label className={MODAL_LABEL_CLASS}>
                    Vektor-ID
                  </label>
                  <input
                    type="text"
                    value={formData.vectorId}
                    onChange={(e) => setFormData(prev => ({ ...prev, vectorId: e.target.value }))}
                    className={`${MODAL_INPUT_CLASS} border-surface-raised font-mono`}
                    placeholder="Vektor-ID eingeben (optional)"
                  />
                </div>
              </div>

              <div className="mb-[18px]">
                <label className={MODAL_LABEL_CLASS}>
                  MCP-URL
                </label>
                <input
                  type="url"
                  value={formData.mcpUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, mcpUrl: e.target.value }))}
                  className={`${MODAL_INPUT_CLASS} ${errors.mcpUrl ? 'border-status-flagged-border' : 'border-surface-raised'}`}
                  placeholder="https://example.com/mcp-endpoint (optional)"
                />
                {errors.mcpUrl && <div className="mt-1 text-xs text-status-flagged-fg">{errors.mcpUrl}</div>}
              </div>

              <div>
                <label className={MODAL_LABEL_CLASS}>
                  Haupt-Prompt <span className="text-accent-primary">*</span>
                </label>
                <textarea
                  value={formData.mainPrompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, mainPrompt: e.target.value }))}
                  className={`${MODAL_INPUT_CLASS} min-h-[130px] resize-y ${errors.mainPrompt ? 'border-status-flagged-border' : 'border-surface-raised'}`}
                  placeholder="Geben Sie den Haupt-Prompt für Produktempfehlungen ein"
                  rows={4}
                />
                {errors.mainPrompt && <div className="mt-1 text-xs text-status-flagged-fg">{errors.mainPrompt}</div>}
              </div>
            </>
          )}
        </Modal>
      )}
    </AdminDashboardShell>
  );
};

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

export default MainProductPromptPage;
