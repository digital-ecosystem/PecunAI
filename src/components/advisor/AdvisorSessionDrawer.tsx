'use client';

import React from 'react';
import {
  ArrowLeft,
  Bot,
  CheckCircle,
  ChevronRight,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  User as UserIcon,
  X,
} from 'lucide-react';
import { DashboardQuestions, Session, SessionStatus } from '@/types';
import StatusBadge from '@/components/ui/StatusBadge';

interface ChatMessage {
  id: string;
  role: 'customer' | 'assistant';
  content: string;
  createdAt: string;
}

type Props = {
  isOpen: boolean;
  isStatusUpdating: boolean;
  isChatOpen: boolean;
  isChatLoading: boolean;
  isResendingAdvisorLink?: boolean;
  selectedSession: Session | null;
  chatMessages: ChatMessage[];
  questionAnswer: DashboardQuestions[];
  onCloseDrawer: () => void;
  onCloseChat: () => void;
  onOpenChat: () => void;
  onStatusChange: (sessionId: string, status: SessionStatus) => void;
  onResendAdvisorLink?: (sessionId: string) => void;
  formatDate: (dateString: string) => string;
};

export default function AdvisorSessionDrawer({
  isOpen,
  isStatusUpdating,
  isChatOpen,
  isChatLoading,
  isResendingAdvisorLink,
  selectedSession,
  chatMessages,
  questionAnswer,
  onCloseDrawer,
  onCloseChat,
  onOpenChat,
  onStatusChange,
  onResendAdvisorLink,
  formatDate,
}: Props) {
  if (!isOpen || !selectedSession) return null;

  return (
    <>
      {isStatusUpdating && (
        <div className="fixed inset-0 z-[60] flex justify-center items-center bg-text-primary/40 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
        </div>
      )}

      <div
        className="fixed inset-0 z-50 bg-text-primary/40 backdrop-blur-sm"
        onClick={onCloseDrawer}
      />

      <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-surface-subtle shadow-overlay transition-transform sm:max-w-md md:max-w-2xl lg:max-w-4xl">
        <div className="sticky top-0 z-10 border-b border-line bg-surface-card px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="mr-4 min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold text-text-primary sm:text-xl">
                {isChatOpen ? 'KI Unterhaltung' : 'Empfehlungsdetails'}
              </h2>
            </div>
            <button
              onClick={isChatOpen ? onCloseChat : onCloseDrawer}
              aria-label={isChatOpen ? 'Zurück' : 'Schließen'}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-text-primary transition-colors hover:bg-surface-selected"
            >
              {isChatOpen ? (
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <X className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>

        {isChatOpen ? (
          <div className="flex h-[calc(100vh-80px)] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
              {chatMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-text-muted">
                  <MessageSquare className="mb-4 h-12 w-12" strokeWidth={1.5} />
                  <p className="text-sm">Keine Nachrichten in dieser Unterhaltung</p>
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'customer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex max-w-[85%] items-start gap-2 ${
                        message.role === 'customer' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${
                          message.role === 'customer'
                            ? 'bg-surface-selected text-accent-primary'
                            : 'bg-surface-raised text-text-primary'
                        }`}
                      >
                        {message.role === 'customer' ? (
                          <UserIcon className="h-4 w-4" strokeWidth={1.75} />
                        ) : (
                          <Bot className="h-4 w-4" strokeWidth={1.75} />
                        )}
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          message.role === 'customer'
                            ? 'bg-accent-primary text-text-on-accent'
                            : 'bg-surface-card text-text-primary shadow-soft'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            message.role === 'customer' ? 'text-surface-selected' : 'text-text-muted'
                          }`}
                        >
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6">
            <section className="rounded-2xl bg-surface-card p-4 shadow-soft">
              <h3 className="mb-3 text-base font-semibold text-text-primary sm:text-lg">
                Kundeninformationen
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label className="block text-[11px] tracking-wider text-text-muted">Name</label>
                  <p className="mt-0.5 text-sm text-text-primary">
                    {selectedSession?.personalInfo?.firstName && selectedSession?.personalInfo?.lastName
                      ? `${selectedSession.personalInfo.firstName} ${selectedSession.personalInfo.lastName}`
                      : 'Nicht angegeben'}
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] tracking-wider text-text-muted">E-Mail</label>
                  <p className="mt-0.5 break-all text-sm text-text-primary">
                    {selectedSession.user.email || ''}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-surface-card p-4 shadow-soft">
              <h3 className="mb-3 text-base font-semibold text-text-primary sm:text-lg">
                Sitzungsstatus
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label className="mb-1 block text-[11px] tracking-wider text-text-muted">
                    Aktueller Status
                  </label>
                  <StatusBadge status={selectedSession.status} size="md" />
                </div>
                <div>
                  <label className="block text-[11px] tracking-wider text-text-muted">
                    Erstellungsdatum
                  </label>
                  <p className="mt-0.5 text-sm text-text-primary">
                    {formatDate(selectedSession.createdAt)}
                  </p>
                </div>
                {/* <div>
                  <label className="block text-[11px] tracking-wider text-text-muted">Aktuelle Phase</label>
                  <p className="mt-0.5 text-sm text-text-primary">{selectedSession.phase ?? '—'}</p>
                </div> */}
                <div>
                  <label className="block text-[11px] tracking-wider text-text-muted">
                    Letzte Aktualisierung
                  </label>
                  <p className="mt-0.5 text-sm text-text-primary">
                    {formatDate(selectedSession.updatedAt)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-surface-card p-4 shadow-soft">
              <button
                onClick={onOpenChat}
                disabled={isChatLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 py-3 text-text-on-accent transition-colors hover:bg-accent-primary-hov disabled:opacity-50"
              >
                {isChatLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <MessageSquare className="h-5 w-5" strokeWidth={1.75} />
                )}
                <span className="font-medium">KI Unterhaltung</span>
              </button>
            </section>

            {selectedSession.status !== SessionStatus.DRAFT && (
              <section className="rounded-2xl bg-surface-card p-4 shadow-soft">
                <h3 className="mb-3 text-base font-semibold text-text-primary sm:text-lg">
                  Sitzungs-PDF herunterladen
                </h3>
                {selectedSession?.workflowState?.stepData?.signteq?.status === 'DOCUMENT_COMPLETED' ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
                    <button className="flex-1 rounded-xl bg-accent-primary px-4 py-2 text-text-on-accent transition-colors hover:bg-accent-primary-hov">
                      <a
                        href={`/api/documents/${selectedSession.id}/signed/signature.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center text-sm"
                      >
                        <FileText className="mr-2 h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
                        <span className="truncate">Unterschriebenes PDF herunterladen</span>
                      </a>
                    </button>
                    <button className="flex-1 rounded-xl border border-line-strong bg-surface-card px-4 py-2 text-text-primary transition-colors hover:bg-surface-selected">
                      <a
                        href={`/api/documents/${selectedSession.id}/signed/legitimation.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center text-sm"
                      >
                        <FileText className="mr-2 h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
                        <span className="truncate">Legetimitation herunterladen</span>
                      </a>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-text-muted">
                      Sie müssen das Dokument noch vollständig unterschreiben.
                    </p>
                    {selectedSession?.workflowState?.stepData?.signteq?.documentId && onResendAdvisorLink && (
                      <button
                        onClick={() => onResendAdvisorLink(selectedSession.id)}
                        disabled={isResendingAdvisorLink}
                        className="flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface-card px-4 py-2 text-sm font-medium text-accent-primary transition-colors hover:bg-surface-selected disabled:opacity-50"
                      >
                        {isResendingAdvisorLink ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
                        )}
                        <span>Signaturlink erneut senden</span>
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}

            {(selectedSession.status === SessionStatus.PENDING || selectedSession.status === SessionStatus.APPROVED || selectedSession.status === SessionStatus.REJECTED) && (
              <section className="rounded-2xl bg-surface-card p-4 shadow-soft">
                <h3 className="mb-3 text-base font-semibold text-text-primary sm:text-lg">Aktionen</h3>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => onStatusChange(selectedSession.id, SessionStatus.APPROVED)}
                    className={`flex flex-1 items-center justify-center rounded-xl bg-status-approved-fg px-4 py-2.5 text-sm font-medium text-text-on-accent transition-opacity hover:opacity-90 ${selectedSession.status === SessionStatus.APPROVED ? 'opacity-70 cursor-not-allowed' : ''}`}
                    disabled={isStatusUpdating}
                  >
                    <CheckCircle className="mr-2 h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
                    <span>{`${selectedSession.status === SessionStatus.APPROVED ? 'Sitzung genehmigt' : 'Sitzung genehmigen'}`}</span>
                  </button>
                  <button
                    onClick={() => onStatusChange(selectedSession.id, SessionStatus.REJECTED)}
                    className={`flex flex-1 items-center justify-center rounded-xl bg-status-flagged-fg px-4 py-2.5 text-sm font-medium text-text-on-accent transition-opacity hover:opacity-90 ${selectedSession.status === SessionStatus.REJECTED ? 'opacity-70 cursor-not-allowed' : ''}`}
                    disabled={isStatusUpdating}
                  >
                    <X className="mr-2 h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
                    <span>Sitzung ablehnen</span>
                  </button>
                </div>
              </section>
            )}

            <section className="rounded-2xl bg-surface-card p-4 shadow-soft">
              <h3 className="mb-3 text-base font-semibold text-text-primary sm:text-lg">
                Frage & Antwort
              </h3>

              {questionAnswer?.length > 0 ? (
                questionAnswer.map((item, index) => (
                  <React.Fragment key={index}>
                    <div className="mb-4">
                      <label className="mb-2 block text-[11px] tracking-wider text-text-muted">
                        Frage
                      </label>
                      <div className="rounded-xl border-l-4 border-accent-primary bg-surface-subtle p-3">
                        <p className="text-sm text-text-primary sm:text-base">{item.text}</p>
                      </div>
                    </div>

                    {item.options && item.options.length > 0 && (
                      <div className="mb-4">
                        <label className="mb-2 block text-[11px] tracking-wider text-text-muted">
                          Verfügbare Optionen
                        </label>
                        <div className="space-y-2">
                          {item.options.map((option, optIndex) => {
                            const isSelected = option.value === item.selectedValue;
                            return (
                              <div
                                key={optIndex}
                                className={`flex items-center rounded-xl border p-3 ${
                                  isSelected
                                    ? 'border-status-approved-border bg-status-approved'
                                    : 'border-line bg-surface-subtle'
                                }`}
                              >
                                <div
                                  className={`mr-3 h-2 w-2 flex-shrink-0 rounded-full ${
                                    isSelected ? 'bg-status-approved-fg' : 'bg-text-muted'
                                  }`}
                                />
                                <span
                                  className={`flex-1 text-xs sm:text-sm ${
                                    isSelected
                                      ? 'font-medium text-status-approved-fg'
                                      : 'text-text-primary'
                                  }`}
                                >
                                  {option.label}
                                </span>
                                {isSelected && (
                                  <ChevronRight
                                    className="h-4 w-4 flex-shrink-0 text-status-approved-fg"
                                    strokeWidth={1.75}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="mb-6 rounded-xl border border-status-approved-border bg-status-approved p-3">
                      <label className="mb-1 block text-[11px] tracking-wider text-status-approved-fg">
                        Ausgewählte Antwort
                      </label>
                      <p className="text-sm font-semibold text-status-approved-fg sm:text-base">
                        {item.options && item.options.length > 0
                          ? item.options.find((option) => option.value === item.selectedValue)?.label ||
                            item.selectedValue ||
                            'N/V'
                          : item.selectedValue || 'N/V'}
                      </p>
                    </div>
                  </React.Fragment>
                ))
              ) : (
                <p className="text-sm text-text-muted">Keine Antworten verfügbar.</p>
              )}
            </section>

            <section className="rounded-2xl border border-line bg-surface-selected p-4">
              <div className="flex items-start gap-3">
                <ChevronRight
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-primary"
                  strokeWidth={1.75}
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">Hinweis</p>
                  <p className="mt-1 text-sm text-text-primary">
                    Als Partner können Sie Sitzungen genehmigen oder ablehnen.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
