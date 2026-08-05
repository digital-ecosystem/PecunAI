'use client';

import React, { useEffect, useState } from 'react';
import { Search, CheckCircle, Clock, FileText, ChevronRight, X, Loader2, Hourglass, Ban, MessageSquare, ArrowLeft, Bot, User } from 'lucide-react';
import { DashboardQuestions, Session, SessionStatus } from '@/types';
import { useRouter } from 'next/navigation';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';
import StatusBadge from '@/components/ui/StatusBadge';

interface ChatMessage {
    id: string;
    role: 'customer' | 'assistant';
    content: string;
    createdAt: string;
}

const STATUS_FILTERS = [
    { value: 'all', label: 'Alle' },
    { value: 'DRAFT', label: 'Entwurf' },
    { value: 'PENDING', label: 'Ausstehend' },
    { value: 'REJECTED', label: 'Abgelehnt' },
    { value: 'APPROVED', label: 'Genehmigt' },
];

const Dashboard = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [questionAnswer, setQuestionAnswer] = useState<DashboardQuestions[]>([]);
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);


    useEffect(() => {
        // Fetch sessions from API or database
        const fetchSession = async () => {
            // setLoading('fetching');
            const response = await fetch('/api/admin/dashboard', {
                method: 'GET',
                credentials: 'include',
            });
            const data = await response.json();
            console.log("🚀 ~ fetchSession ~ data:", data)
            // setLoading(null);
            if (data?.success) {
                setSessions(data.sessions);
            } else {
                router.push('/admin/signin')
            }
        }
        fetchSession();
    }, [router])

    useEffect(() => {
        if (selectedSession?.id) {
            const fetchQuestionAnswer = async () => {
                const response = await fetch(`/api/admin/dashboard/user-info/questions?sessionId=${selectedSession.id}`, {
                    method: 'GET',
                    credentials: 'include',
                });
                const data = await response.json();
                if (data?.success) {
                    setQuestionAnswer(data.data);
                } else {
                    router.push('/admin/signin')
                }
            }
            fetchQuestionAnswer();
        }
    }, [selectedSession, router])


    // const handleLogout = async () => {
    //     try {
    //         const response = await fetch('/api/auth/logout', {
    //             method: 'POST'
    //         });
    //         await response.json();
    //         router.push('/admin/signin')
    //     } catch (error) {
    //         console.log('error : ', error)
    //     }
    // }

    const filteredSessions = sessions.filter(session => {
        const matchesSearch = session?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalSessions = sessions.length;
    const approvedSessions = sessions.filter(s => s.status === 'APPROVED').length;
    const draftSessions = sessions.filter(s => s.status === 'DRAFT').length;
    const pendingSessions = sessions.filter(s => s.status === 'PENDING').length;
    const rejectedSessions = sessions.filter(s => s.status === 'REJECTED').length;

    const handleSessionClick = (session: Session) => {
        console.log("🚀 ~ handleSessionClick ~ session:", session)
        setSelectedSession(session);
        setIsDrawerOpen(true);
    };

    const closeDrawer = () => {
        setIsDrawerOpen(false);
        setSelectedSession(null);
        setIsChatOpen(false);
        setChatMessages([]);
    };

    const openChatView = async () => {
        if (!selectedSession?.id) return;
        setIsChatLoading(true);
        try {
            const response = await fetch(`/api/admin/dashboard/chat-messages?sessionId=${selectedSession.id}`, {
                method: 'GET',
                credentials: 'include',
            });
            const data = await response.json();
            if (data?.success) {
                setChatMessages(data.messages || []);
                setIsChatOpen(true);
            }
        } catch (error) {
            console.error('Error fetching chat messages:', error);
        } finally {
            setIsChatLoading(false);
        }
    };

    const closeChatView = () => {
        setIsChatOpen(false);
        setChatMessages([]);
    };

    const handleStatusChange = async (sessionId: string, status: SessionStatus) => {
        setIsLoading(true);
        const res = await fetch('/api/admin/dashboard/user-info/session/status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                status,
            }),
        });

        const data = await res.json();
        if (data.success) {
            setSessions(sessions.map(session =>
                session.id === sessionId ? { ...session, status: status } : session
            ));
        } else {
            alert('Failed to update status');
        }
        setTimeout(() => {
            setIsLoading(false);
            closeDrawer()
        }, 1000);

    }

    const handleToggleExclude = async (sessionId: string) => {
        setTogglingId(sessionId);
        try {
            const res = await fetch(`/api/admin/sessions/${sessionId}/exclude`, {
                method: 'PATCH',
                credentials: 'include',
            });
            const data = await res.json();
            if (data.success) {
                setSessions(prev => prev.map(s =>
                    s.id === sessionId ? { ...s, excludedFromReport: data.excludedFromReport } : s
                ));
            }
        } catch (error) {
            console.error('Failed to toggle session exclude:', error);
        } finally {
            setTogglingId(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Both names arrive pre-constructed on the /api/admin/dashboard payload. No extra fetch.
    // agentName is null when a session has no linked agent; partnerName is always a real
    // name (partnerId is required on QASession) — the fallback there is only a type guard.
    const formatPersonName = (name?: string | null) => name?.trim() || '—';

    const getRecipientName = (index: number): string | null => {
        const recipients = selectedSession?.workflowState?.stepData?.signteq?.recipients;
        if (!Array.isArray(recipients)) return null;
        const recipient = recipients[index] as { name?: unknown } | undefined;
        const name = recipient?.name;
        return typeof name === 'string' && name.trim().length > 0 ? name : null;
    };

    return (
        <>
            <AdminDashboardShell contentClassName="max-w-[1180px]">
                {/* KPI row — two stacked cards · focal total · two stacked cards */}
                <div className="mb-8 flex w-full flex-wrap items-stretch gap-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-2.5 max-sm:basis-full max-sm:flex-row max-sm:flex-wrap">
                        <StatCard
                            icon={<Hourglass className="h-[18px] w-[18px] text-accent-primary" strokeWidth={1.75} />}
                            value={pendingSessions}
                            label="Ausstehend"
                        />
                        <StatCard
                            icon={<Clock className="h-[18px] w-[18px] text-status-neutral-fg" strokeWidth={1.75} />}
                            value={draftSessions}
                            label="Entwurf"
                        />
                    </div>

                    <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface-card p-4 text-center shadow-soft transition-shadow hover:shadow-raised max-sm:order-first max-sm:basis-full">
                        <div className="mb-1 flex h-[34px] w-[34px] items-center justify-center rounded-xl bg-surface-subtle text-accent-primary">
                            <FileText className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <div className="text-[28px] font-semibold leading-none tabular-nums text-text-primary">
                            {totalSessions}
                        </div>
                        <div className="mt-1 text-[11px] text-text-muted">Gesamtsitzungen</div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-2.5 max-sm:basis-full max-sm:flex-row max-sm:flex-wrap">
                        <StatCard
                            icon={<CheckCircle className="h-[18px] w-[18px] text-status-approved-fg" strokeWidth={1.75} />}
                            value={approvedSessions}
                            label="Genehmigt"
                        />
                        <StatCard
                            icon={<Ban className="h-[18px] w-[18px] text-status-flagged-fg" strokeWidth={1.75} />}
                            value={rejectedSessions}
                            label="Abgelehnt"
                        />
                    </div>
                </div>

                {/* Search + status filter */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 max-sm:flex-col max-sm:items-stretch">
                    <div className="relative min-w-[200px] max-sm:w-full max-sm:min-w-0">
                        <Search
                            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                            strokeWidth={1.75}
                        />
                        <input
                            type="text"
                            placeholder="Sitzungen suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-2xl bg-surface-card py-2.5 pl-10 pr-3.5 text-xs text-text-primary shadow-soft placeholder:text-text-muted focus:outline-none focus:shadow-focus-ring"
                        />
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-sm:w-full">
                        {STATUS_FILTERS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setStatusFilter(option.value)}
                                aria-pressed={statusFilter === option.value}
                                className={`rounded-xl px-3 py-1.5 text-[10px] transition-shadow max-sm:flex-1 max-sm:text-center ${statusFilter === option.value
                                    ? 'bg-accent-primary text-text-on-accent'
                                    : 'bg-surface-card text-text-primary shadow-soft hover:shadow-raised'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sessions list */}
                {filteredSessions.length === 0 ? (
                    <StatePanel
                        icon={<FileText className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                        iconClassName="bg-surface-subtle text-accent-primary"
                        title={totalSessions === 0 ? 'Noch keine Sitzungen' : 'Keine Sitzungen gefunden'}
                        description={
                            totalSessions === 0
                                ? 'Sitzungen erscheinen hier, sobald sie erstellt wurden.'
                                : 'Keine Sitzungen gefunden, die Ihren Kriterien entsprechen.'
                        }
                    />
                ) : (
                    <div>
                        {/* gap-x-2.5 mirrors the row cards' own gap so each label stays
                            aligned over its cell — with six columns the un-gapped header
                            drifted noticeably from the data. */}
                        <div className="mb-1.5 hidden gap-x-2.5 px-3.5 sm:flex">
                            <div className="flex-[1.8] text-[9px] tracking-wider text-text-muted">SITZUNG</div>
                            <div className="flex-[1.1] text-[9px] tracking-wider text-text-muted">AGENT</div>
                            <div className="flex-[1.1] text-[9px] tracking-wider text-text-muted">BERATER</div>
                            <div className="flex-[0.8] text-[9px] tracking-wider text-text-muted">STATUS</div>
                            <div className="flex-[0.9] text-[9px] tracking-wider text-text-muted">ERSTELLT</div>
                            <div className="flex-[0.7] text-right text-[9px] tracking-wider text-text-muted">IN BERICHT</div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {filteredSessions.map((session) => (
                                <div
                                    key={session.id}
                                    onClick={() => handleSessionClick(session)}
                                    className="flex cursor-pointer items-center gap-x-2.5 gap-y-1.5 rounded-2xl bg-surface-card p-3.5 shadow-soft transition-shadow hover:shadow-raised max-sm:flex-wrap max-sm:gap-y-2.5"
                                >
                                    <div className="flex min-w-0 flex-[1.8] items-center gap-2.5 max-sm:basis-full">
                                        <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-surface-subtle text-accent-primary">
                                            <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate text-xs font-medium text-text-primary">
                                                {session?.personalInfo?.firstName} {session?.personalInfo?.lastName}
                                            </div>
                                            <div className="truncate text-[11px] text-text-muted" title={session.user.email}>
                                                {session.user.email}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Agent + Berater — plain text, same treatment as the
                                        customer dashboard's AGENT column. Below sm the two
                                        share one wrapped line (50% each, less half the
                                        gap), so the status/date/toggle line below is
                                        untouched. The column header row is hidden there,
                                        so each carries its own micro-label in the exact
                                        header type style — without it the two names sit
                                        side by side with nothing saying which is which. */}
                                    <div
                                        className="min-w-0 flex-[1.1] pr-2 max-sm:order-3 max-sm:flex-[0_0_calc(50%_-_5px)] max-sm:pr-0"
                                        title={formatPersonName(session.agentName)}
                                    >
                                        <div className="mb-0.5 text-[9px] tracking-wider text-text-muted sm:hidden">AGENT</div>
                                        <div className="truncate text-xs text-text-primary">
                                            {formatPersonName(session.agentName)}
                                        </div>
                                    </div>
                                    <div
                                        className="min-w-0 flex-[1.1] pr-2 max-sm:order-4 max-sm:flex-[0_0_calc(50%_-_5px)] max-sm:pr-0"
                                        title={formatPersonName(session.partnerName)}
                                    >
                                        <div className="mb-0.5 text-[9px] tracking-wider text-text-muted sm:hidden">BERATER</div>
                                        <div className="truncate text-xs text-text-primary">
                                            {formatPersonName(session.partnerName)}
                                        </div>
                                    </div>
                                    <div className="flex-[0.8] max-sm:order-5 max-sm:flex-none">
                                        <StatusBadge status={session.status} />
                                    </div>
                                    <div className="flex-[0.9] text-[10px] text-text-muted max-sm:order-6 max-sm:flex-1">
                                        {formatDate(session.createdAt)}
                                    </div>
                                    <div
                                        className="flex flex-[0.7] justify-end max-sm:order-7 max-sm:flex-none"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {togglingId === session.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleToggleExclude(session.id); }}
                                                title={session.excludedFromReport ? 'Von Statistiken ausgeschlossen' : 'In Statistiken eingeschlossen'}
                                                className={`relative inline-flex h-[22px] w-[38px] flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:shadow-focus-ring ${session.excludedFromReport ? 'bg-surface-raised' : 'bg-toggle-on'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-[18px] w-[18px] transform rounded-full bg-surface-card shadow-soft transition-transform ${session.excludedFromReport ? 'translate-x-0.5' : 'translate-x-[18px]'
                                                        }`}
                                                />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </AdminDashboardShell>

            {/* Session Details Drawer */}
            {isDrawerOpen && selectedSession && (
                isLoading ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 backdrop-blur-sm">
                        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
                    </div>
                ) : (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-50 flex justify-end bg-text-primary/40 backdrop-blur-sm"
                            onClick={closeDrawer}
                        />
                        {/* Drawer */}
                        <div className="fixed inset-y-0 right-0 z-50 w-full transform overflow-y-auto bg-surface-subtle shadow-overlay transition-transform sm:max-w-md md:max-w-2xl lg:max-w-4xl">
                            {/* Drawer Header */}
                            <div className="sticky top-0 z-10 border-b border-line bg-surface-card px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="mr-4 min-w-0 flex-1">
                                        <h2 className="truncate text-lg font-bold text-text-primary sm:text-xl">
                                            {isChatOpen ? 'KI Unterhaltung' : 'Sitzungsdetails'}
                                        </h2>
                                        {/* selectedSession.id IS the qaSessionId — the same value this page
                                            already passes to the questions and chat-messages endpoints. Was
                                            read off personalInfo.qaSessionId, a back-reference that only
                                            exists once the customer has completed the personal-info step, so
                                            the line rendered as a bare "#" for every earlier-stage session. */}
                                        <p className="truncate text-xs text-text-muted sm:text-sm">Sitzungs-ID: #{selectedSession?.id}</p>
                                    </div>
                                    <button
                                        onClick={isChatOpen ? closeChatView : closeDrawer}
                                        aria-label={isChatOpen ? 'Zurück zu den Sitzungsdetails' : 'Sitzungsdetails schließen'}
                                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary transition-colors hover:bg-surface-selected"
                                    >
                                        {isChatOpen ? <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> : <X className="h-4 w-4" strokeWidth={1.75} />}
                                    </button>
                                </div>
                            </div>

                            {/* Chat View */}
                            {isChatOpen ? (
                                <div className="flex h-[calc(100vh-80px)] flex-col">
                                    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
                                        {chatMessages.length === 0 ? (
                                            <div className="flex h-full flex-col items-center justify-center text-text-muted">
                                                <MessageSquare className="mb-4 h-12 w-12" strokeWidth={1.75} />
                                                <p className="text-sm">Keine Nachrichten in dieser Unterhaltung</p>
                                            </div>
                                        ) : (
                                            chatMessages.map((message) => (
                                                <div
                                                    key={message.id}
                                                    className={`flex ${message.role === 'customer' ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div className={`flex max-w-[85%] items-start gap-2 ${message.role === 'customer' ? 'flex-row-reverse' : ''}`}>
                                                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${message.role === 'customer'
                                                            ? 'bg-surface-selected text-accent-primary'
                                                            : 'bg-surface-card text-text-primary shadow-soft'
                                                            }`}>
                                                            {message.role === 'customer'
                                                                ? <User className="h-4 w-4" strokeWidth={1.75} />
                                                                : <Bot className="h-4 w-4" strokeWidth={1.75} />
                                                            }
                                                        </div>
                                                        <div className={`rounded-2xl px-4 py-2 ${message.role === 'customer'
                                                            ? 'bg-accent-primary text-text-on-accent'
                                                            : 'bg-surface-card text-text-primary shadow-soft'
                                                            }`}>
                                                            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                                                            <p className={`mt-1 text-xs ${message.role === 'customer' ? 'text-surface-selected/85' : 'text-text-muted'
                                                                }`}>
                                                                {new Date(message.createdAt).toLocaleTimeString('de-DE', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Drawer Content */
                                <div className="space-y-4 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6">
                                    {/* User Information */}
                                    <div className="rounded-2xl bg-surface-card p-4 shadow-soft">
                                        <h3 className="mb-3 text-base font-semibold text-text-primary sm:text-lg">Benutzerinformationen</h3>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-text-muted sm:text-sm">Name</label>
                                                <p className="text-sm text-text-primary">{selectedSession?.personalInfo?.firstName && selectedSession?.personalInfo?.lastName ? selectedSession?.personalInfo?.firstName + ' ' + selectedSession?.personalInfo?.lastName : ''}</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-text-muted sm:text-sm">E-Mail</label>
                                                <p className="break-all text-sm text-text-primary">{selectedSession.user.email || ''}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Session Status */}
                                    <div className="rounded-2xl bg-surface-card p-4 shadow-soft">
                                        <h3 className="mb-3 text-base font-semibold text-text-primary sm:text-lg">Sitzungsstatus</h3>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-text-muted sm:text-sm">Aktueller Status</label>
                                                <StatusBadge status={selectedSession.status} size="md" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-text-muted sm:text-sm">Erstellungsdatum</label>
                                                <p className="text-sm text-text-primary">{formatDate(selectedSession.createdAt)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* KI Unterhaltung Button */}
                                    <div className="rounded-2xl bg-surface-card p-4 shadow-soft">
                                        <button
                                            onClick={openChatView}
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
                                    </div>

                                    {/* Download the session PDF */}
                                    {
                                        selectedSession.status != SessionStatus.DRAFT && (
                                            <div className="rounded-2xl bg-surface-card p-4 shadow-soft">
                                                <h3 className="mb-3 text-base font-semibold text-text-primary sm:text-lg">Sitzungs-PDF herunterladen</h3>
                                                {selectedSession?.workflowState?.stepData?.signteq?.status === "DOCUMENT_COMPLETED" ? (
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
                                                        <button className="flex-1 rounded-xl bg-accent-primary px-4 py-2 text-sm text-text-on-accent transition-colors hover:bg-accent-primary-hov">
                                                            <a href={`/api/documents/${selectedSession.id}/signed/signature.pdf`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                                                                <FileText className="mr-2 h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
                                                                <span className="truncate">Unterschriebenes PDF herunterladen</span>
                                                            </a>
                                                        </button>
                                                        <button className="flex-1 rounded-xl border border-line-strong bg-surface-card px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface-selected">
                                                            <a
                                                                href={`/api/documents/${selectedSession.id}/signed/legitimation.pdf`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center justify-center"
                                                            >
                                                                <FileText className="mr-2 h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
                                                                <span className="truncate">Legetimitation herunterladen</span>
                                                            </a>
                                                        </button>
                                                    </div>) : (
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
                                                        <p className="text-sm text-text-muted">
                                                            {(() => {
                                                                const recipient1Name = getRecipientName(1);
                                                                return recipient1Name
                                                                    ? `Berater ${recipient1Name} muss noch unterschreiben`
                                                                    : 'Berater muss noch unterschreiben';
                                                            })()}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    }

                                    {/* Action Buttons */}
                                    {selectedSession.status === SessionStatus.PENDING &&
                                        <div className="rounded-2xl bg-surface-card p-4 shadow-soft">
                                            <h3 className="mb-3 text-base font-semibold text-text-primary sm:text-lg">Aktionen</h3>
                                            <div className="flex flex-col gap-3 sm:flex-row">
                                                {selectedSession.status === SessionStatus.PENDING && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                handleStatusChange(selectedSession.id, SessionStatus.APPROVED);
                                                            }}
                                                            className="flex flex-1 items-center justify-center rounded-xl bg-status-approved-fg px-4 py-2 text-sm font-medium text-text-on-accent transition-opacity hover:opacity-90"
                                                        >
                                                            <CheckCircle className="mr-2 h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
                                                            <span>Sitzung genehmigen</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleStatusChange(selectedSession.id, SessionStatus.REJECTED);
                                                            }}
                                                            className="flex flex-1 items-center justify-center rounded-xl bg-status-flagged-fg px-4 py-2 text-sm font-medium text-text-on-accent transition-opacity hover:opacity-90"
                                                        >
                                                            <X className="mr-2 h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
                                                            <span>Sitzung ablehnen</span>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    }

                                    {/* Question and Options */}
                                    <div className="rounded-2xl bg-surface-card p-4 shadow-soft">
                                        <h3 className="mb-3 text-base font-semibold text-text-primary sm:text-lg">Frage & Antwort</h3>

                                        {questionAnswer?.length > 0 &&
                                            questionAnswer.map((item, index) => {
                                                return (
                                                    <React.Fragment key={index}>
                                                        {/* Question */}
                                                        <div className="mb-4">
                                                            <label className="mb-2 block text-xs font-medium text-text-muted sm:text-sm">Frage</label>
                                                            <div className="rounded-xl border-l-4 border-accent-primary bg-surface-subtle p-3">
                                                                <p className="text-sm text-text-primary sm:text-base">{item.text}</p>
                                                            </div>
                                                        </div>

                                                        {/* Available Options - only show if there are options */}
                                                        {item.options && item.options.length > 0 && (
                                                            <div className="mb-4">
                                                                <label className="mb-2 block text-xs font-medium text-text-muted sm:text-sm">Verfügbare Optionen</label>
                                                                <div className="space-y-2">
                                                                    {item.options.map((option, optIndex) => {
                                                                        const isSelected = option.value === item.selectedValue
                                                                        return (
                                                                            <div
                                                                                key={optIndex}
                                                                                className={`flex items-center rounded-xl border p-3 ${isSelected ? 'border-status-approved-border bg-status-approved' : 'border-line bg-surface-subtle'
                                                                                    }`}
                                                                            >
                                                                                <div
                                                                                    className={`mr-3 h-2 w-2 flex-shrink-0 rounded-full ${isSelected ? 'bg-status-approved-fg' : 'bg-line-strong'
                                                                                        }`}
                                                                                />
                                                                                <span
                                                                                    className={`flex-1 text-xs sm:text-sm ${isSelected ? 'font-medium text-status-approved-fg' : 'text-text-primary'
                                                                                        }`}
                                                                                >
                                                                                    {option.label}
                                                                                </span>
                                                                                {isSelected && <ChevronRight className="h-4 w-4 flex-shrink-0 text-status-approved-fg" strokeWidth={1.75} />}
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Selected Answer Highlight */}
                                                        <div className="mb-6 rounded-xl border border-status-approved-border bg-status-approved p-3">
                                                            <label className="mb-1 block text-xs font-medium text-status-approved-fg sm:text-sm">Ausgewählte Antwort</label>
                                                            <p className="text-sm font-semibold text-status-approved-fg sm:text-base">
                                                                {item.options && item.options.length > 0
                                                                    ? item.options.find(option => option.value === item.selectedValue)?.label || item.selectedValue || 'N/V'
                                                                    : item.selectedValue || 'N/V'
                                                                }
                                                            </p>
                                                        </div>
                                                    </React.Fragment>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )
            )}
        </>
    );
}

const StatCard = ({
    icon,
    value,
    label,
}: {
    icon: React.ReactNode;
    value: number;
    label: string;
}) => (
    <div className="flex flex-1 items-center gap-3 rounded-2xl bg-surface-card px-4 py-3.5 shadow-soft transition-shadow hover:shadow-raised max-sm:basis-full max-sm:flex-col max-sm:gap-1.5 max-sm:text-center">
        <span className="flex-shrink-0">{icon}</span>
        <div className="max-sm:flex max-sm:flex-col max-sm:items-center">
            <div className="text-lg font-semibold leading-none tabular-nums text-text-primary">{value}</div>
            <div className="mt-1 text-[10px] text-text-muted">{label}</div>
        </div>
    </div>
);

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
        <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${iconClassName}`}>{icon}</div>
        <div className="mb-1 text-[13px] font-semibold text-text-primary">{title}</div>
        <div className="max-w-[280px] text-[11px] text-text-muted">{description}</div>
    </div>
);

export default Dashboard;
