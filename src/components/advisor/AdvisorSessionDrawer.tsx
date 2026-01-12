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
  User as UserIcon,
  X,
} from 'lucide-react';
import { DashboardQuestions, Session, SessionStatus } from '@/types';

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
  selectedSession: Session | null;
  chatMessages: ChatMessage[];
  questionAnswer: DashboardQuestions[];
  onCloseDrawer: () => void;
  onCloseChat: () => void;
  onOpenChat: () => void;
  onStatusChange: (sessionId: string, status: SessionStatus) => void;
  formatDate: (dateString: string) => string;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
};

export default function AdvisorSessionDrawer({
  isOpen,
  isStatusUpdating,
  isChatOpen,
  isChatLoading,
  selectedSession,
  chatMessages,
  questionAnswer,
  onCloseDrawer,
  onCloseChat,
  onOpenChat,
  onStatusChange,
  formatDate,
  getStatusColor,
  getStatusLabel,
}: Props) {
  if (!isOpen || !selectedSession) return null;

  return (
    <>
      {isStatusUpdating && (
        <div className="fixed inset-0 z-[60] flex justify-center items-center bg-black/20 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      )}

      <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={onCloseDrawer} />

      <div className="fixed inset-y-0 right-0 w-full sm:max-w-md md:max-w-2xl lg:max-w-4xl bg-white shadow-xl z-50 transform transition-transform overflow-y-auto">
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {isChatOpen ? 'KI Unterhaltung' : 'Empfehlungsdetails'}
              </h2>
            </div>
            <button
              onClick={isChatOpen ? onCloseChat : onCloseDrawer}
              className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
            >
              {isChatOpen ? (
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              ) : (
                <X className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {isChatOpen ? (
          <div className="flex flex-col h-[calc(100vh-80px)]">
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <MessageSquare className="w-12 h-12 mb-4 text-gray-300" />
                  <p className="text-sm">Keine Nachrichten in dieser Unterhaltung</p>
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'customer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex items-start gap-2 max-w-[85%] ${
                        message.role === 'customer' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.role === 'customer' ? 'bg-emerald-100' : 'bg-gray-100'
                        }`}
                      >
                        {message.role === 'customer' ? (
                          <UserIcon className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <Bot className="w-4 h-4 text-gray-700" />
                        )}
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          message.role === 'customer'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            message.role === 'customer' ? 'text-emerald-100' : 'text-gray-500'
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
          <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Kundeninformationen</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-600">Name</label>
                  <p className="text-sm text-gray-900">
                    {selectedSession?.personalInfo?.firstName && selectedSession?.personalInfo?.lastName
                      ? `${selectedSession.personalInfo.firstName} ${selectedSession.personalInfo.lastName}`
                      : 'Nicht angegeben'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-600">E-Mail</label>
                  <p className="text-sm text-gray-900 break-all">{selectedSession.user.email || ''}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Sitzungsstatus</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-600">Aktueller Status</label>
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                      selectedSession.status
                    )}`}
                  >
                    {getStatusLabel(selectedSession.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-600">Erstellungsdatum</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedSession.createdAt)}</p>
                </div>
                {/* <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-600">Aktuelle Phase</label>
                  <p className="text-sm text-gray-900">{selectedSession.phase ?? '—'}</p>
                </div> */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-600">Letzte Aktualisierung</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedSession.updatedAt)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <button
                onClick={onOpenChat}
                disabled={isChatLoading}
                className="w-full bg-emerald-600 text-white px-4 py-3 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isChatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                <span className="font-medium">KI Unterhaltung</span>
              </button>
            </div>

            {selectedSession.status !== SessionStatus.DRAFT && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
                  Sitzungs-PDF herunterladen
                </h3>
                {selectedSession?.workflowState?.stepData?.signteq?.status === 'DOCUMENT_COMPLETED' ? (
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                    <button className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors">
                      <a
                        href={`/api/documents/${selectedSession.id}/signed/signature.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center"
                      >
                        <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">Unterschriebenes PDF herunterladen</span>
                      </a>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                    <p className="text-sm text-gray-500">Sie müssen das Dokument noch vollständig unterschreiben.</p>
                  </div>
                )}
              </div>
            )}

            {(selectedSession.status === SessionStatus.PENDING || selectedSession.status === SessionStatus.APPROVED || selectedSession.status === SessionStatus.REJECTED) && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Aktionen</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => onStatusChange(selectedSession.id, SessionStatus.APPROVED)}
                    className={`flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center ${selectedSession.status === SessionStatus.APPROVED ? 'opacity-70 cursor-not-allowed' : ''}`}
                    disabled={isStatusUpdating}
                  >
                    <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0 " />
                    <span>{`${selectedSession.status === SessionStatus.APPROVED ? 'Sitzung genehmigt' : 'Sitzung genehmigen'}`}</span>
                  </button>
                  <button
                    onClick={() => onStatusChange(selectedSession.id, SessionStatus.REJECTED)}
                    className={`flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center ${selectedSession.status === SessionStatus.REJECTED ? 'opacity-70 cursor-not-allowed' : ''}`}
                    disabled={isStatusUpdating}
                  >
                    <X className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>Sitzung ablehnen</span>
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Frage & Antwort</h3>

              {questionAnswer?.length > 0 ? (
                questionAnswer.map((item, index) => (
                  <React.Fragment key={index}>
                    <div className="mb-4">
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">Frage</label>
                      <div className="bg-emerald-50 border-l-4 border-emerald-400 p-3 rounded">
                        <p className="text-sm sm:text-base text-gray-900">{item.text}</p>
                      </div>
                    </div>

                    {item.options && item.options.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">
                          Verfügbare Optionen
                        </label>
                        <div className="space-y-2">
                          {item.options.map((option, optIndex) => {
                            const isSelected = option.value === item.selectedValue;
                            return (
                              <div
                                key={optIndex}
                                className={`flex items-center p-3 rounded-lg border ${
                                  isSelected ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div
                                  className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${
                                    isSelected ? 'bg-green-500' : 'bg-gray-300'
                                  }`}
                                />
                                <span
                                  className={`text-xs sm:text-sm flex-1 ${
                                    isSelected ? 'text-green-900 font-medium' : 'text-gray-700'
                                  }`}
                                >
                                  {option.label}
                                </span>
                                {isSelected && (
                                  <ChevronRight className="w-4 h-4 text-green-600 flex-shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                      <label className="block text-xs sm:text-sm font-medium text-green-800 mb-1">
                        Ausgewählte Antwort
                      </label>
                      <p className="text-sm sm:text-base text-green-900 font-semibold">
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
                <p className="text-sm text-gray-500">Keine Antworten verfügbar.</p>
              )}
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ChevronRight className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">Hinweis</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    Als Partner können Sie Sitzungen genehmigen oder ablehnen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
