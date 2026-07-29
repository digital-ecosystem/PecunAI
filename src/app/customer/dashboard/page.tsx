'use client';

// pages/dashboard.tsx
import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { Agent, Session, SessionStatus, User } from '@/types';
import {
    AlertTriangle,
    Ban,
    CheckCircle,
    Clock,
    FileText,
    Hourglass,
    LayoutDashboard,
    LogOut,
    Plus,
    Search,
} from 'lucide-react';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import DashboardShell, { DashboardProfilePill } from '@/components/ui/DashboardShell';
import StatusBadge from '@/components/ui/StatusBadge';

const STATUS_FILTERS = [
    { value: 'all', label: 'Alle' },
    { value: 'DRAFT', label: 'Entwurf' },
    { value: 'PENDING', label: 'Anfrage' },
    { value: 'REJECTED', label: 'Abgelehnt' },
    { value: 'APPROVED', label: 'Genehmigt' },
];

const Dashboard = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [user, setUser] = useState<User | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(false);
    const [isStartDrawerOpen, setIsStartDrawerOpen] = useState(false);
    const [partnerCode, setPartnerCode] = useState('');
    const [partnerLookupLoading, setPartnerLookupLoading] = useState(false);
    const [partnerLookupError, setPartnerLookupError] = useState<string | null>(null);
    const [partnerPreview, setPartnerPreview] = useState<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        referralCode: string;
    } | null>(null);
    const [showOnboardingWelcomePopup, setShowOnboardingWelcomePopup] = useState(false);
    const [pendingStartPartnerCode, setPendingStartPartnerCode] = useState<string | null>(null);
    const [startError, setStartError] = useState<string | null>(null);
    const [didAutostart, setDidAutostart] = useState(false);
    const [drawerAgentCode, setDrawerAgentCode] = useState('');

    const [drawerAgentLookupError, setDrawerAgentLookupError] = useState<string | null>(null);
    const [drawerAgentPreview, setDrawerAgentPreview] = useState<Agent | null>(null);
    const [pendingStartAgentCode, setPendingStartAgentCode] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    // Presentational only: drives the approved design's explicit error panel.
    // Set from the exact same failure branches the previous code already had.
    const [sessionsError, setSessionsError] = useState(false);
    const [sessionsReloadKey, setSessionsReloadKey] = useState(0);
    const [allSessionsForStats, setAllSessionsForStats] = useState<Session[]>([]);
    const drawerScrollRef = useRef<HTMLDivElement>(null);

    const getCookieValue = (name: string) => {
        if (typeof document === 'undefined') return '';
        const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1')}=([^;]*)`));
        return match ? decodeURIComponent(match[1]) : '';
    };

    const clearCookie = (name: string) => {
        document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
    };

    const openSession = allSessionsForStats.find(
        s => s.status === SessionStatus.DRAFT
    );

    console.log('🚀 ~ Dashboard ~ openSession:', allSessionsForStats);
    useEffect(() => {
        // Fetch login user
        const fetchUser = async () => {
            const response = await fetch('/api/auth/me');
            const user = await response.json();
            if (user?.success) {
                setUser(user.user);
            } else {
                setUser(null);
                router.push('/customer/signin')
            }
        };
        fetchUser();
    }, [router]);

    // Fetch all sessions for statistics (without pagination)
    useEffect(() => {
        const fetchAllSessions = async () => {
            try {
                const response = await fetch('/api/dashboard?limit=1000');
                const data = await response.json();
                if (data?.success) {
                    setAllSessionsForStats(data.sessions);
                }
            } catch (error) {
                console.error('Error fetching all sessions:', error);
            }
        };
        fetchAllSessions();
    }, [sessionsReloadKey]);

    // Fetch paginated sessions based on filters
    useEffect(() => {
        const fetchSessions = async () => {
            setIsLoadingSessions(true);
            try {
                const params = new URLSearchParams({
                    page: currentPage.toString(),
                    limit: itemsPerPage.toString(),
                    search: searchTerm,
                    status: statusFilter
                });

                const response = await fetch(`/api/dashboard?${params}`);
                const data = await response.json();

                if (data?.success) {
                    setSessions(data.sessions);
                    setTotalPages(data.pagination.totalPages);
                    setTotalCount(data.pagination.totalCount);
                    setSessionsError(false);
                } else {
                    setSessions([]);
                    setTotalPages(0);
                    setTotalCount(0);
                    setSessionsError(true);
                }
            } catch (error) {
                console.error('Error fetching sessions:', error);
                setSessions([]);
                setSessionsError(true);
            } finally {
                setIsLoadingSessions(false);
            }
        };

        // Debounce search to avoid too many API calls
        const timeoutId = setTimeout(() => {
            fetchSessions();
        }, searchTerm ? 500 : 0);

        return () => clearTimeout(timeoutId);
    }, [currentPage, itemsPerPage, searchTerm, statusFilter, sessionsReloadKey]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Calculate display indices for pagination info
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });
            const res = await response.json();
            if (res?.success) {
                router.push('/customer/signin')
            } else {
                setUser(null);
            }
        } catch (error) {
            console.log('error : ', error)
        }
    }

    const openWelcomeAndQueueStart = (opts?: { partnerCode?: string; agentCode?: string }) => {
        setIsStartDrawerOpen(false);
        setPendingStartPartnerCode(opts?.partnerCode || null);
        setPendingStartAgentCode(opts?.agentCode || null);
        setShowOnboardingWelcomePopup(true);
    };

    const startSession = async (opts?: { partnerCode?: string; agentCode?: string }) => {
        setStartError(null);
        setLoading(true);
        let didNavigate = false;
        try {
            const response = await fetch('/api/qa-session/create', {
                method: 'POST',
                body: JSON.stringify(opts?.partnerCode ? { partnerCode: opts.partnerCode } : {}),
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await response.json();
            if (res?.success && res?.session?.id) {
                if (opts?.agentCode) {
                    await fetch('/api/qa-session/agent', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId: res.session.id, agentCode: opts.agentCode }),
                    }).catch(() => console.warn('agent code assignment failed'));
                }
                setIsStartDrawerOpen(false);
                didNavigate = true;
                router.push('/customer/voice-session/' + res.session.id);
                return;
            }
            setStartError(res?.message || 'Sitzung konnte nicht erstellt werden');
        } catch {
            setStartError('Sitzung konnte nicht erstellt werden');
        } finally {
            if (!didNavigate) setLoading(false);
        }
    };

    const handleWelcomeContinue = async () => {
        const queuedPartnerCode = pendingStartPartnerCode;
        const queuedAgentCode   = pendingStartAgentCode;
        setShowOnboardingWelcomePopup(false);
        setPendingStartPartnerCode(null);
        setPendingStartAgentCode(null);
        await startSession({
            ...(queuedPartnerCode ? { partnerCode: queuedPartnerCode } : {}),
            ...(queuedAgentCode   ? { agentCode:   queuedAgentCode   } : {}),
        });
    };

    const handleLookupBoth = async () => {
        if (!partnerCode.trim() || !drawerAgentCode.trim()) return;

        setPartnerLookupError(null);
        setPartnerPreview(null);
        setDrawerAgentLookupError(null);
        setDrawerAgentPreview(null);
        setPartnerLookupLoading(true);

        try {
            const [partnerRes, agentRes] = await Promise.all([
                fetch(`/api/advisor/lookup?code=${encodeURIComponent(partnerCode.trim())}`),
                fetch(`/api/qa-session/agent?code=${encodeURIComponent(drawerAgentCode.trim())}`),
            ]);
            const [partnerData, agentData] = await Promise.all([partnerRes.json(), agentRes.json()]);

            if (partnerData?.success && partnerData?.partner) {
                setPartnerPreview(partnerData.partner);
            } else {
                setPartnerLookupError(partnerData?.message || 'Partner-Code ungültig');
            }

            if (agentData?.success && agentData?.agent) {
                setDrawerAgentPreview(agentData.agent);
            } else {
                setDrawerAgentLookupError(agentData?.message || 'Agenten-Code ungültig');
            }
        } catch {
            setPartnerLookupError('Anfrage fehlgeschlagen');
        } finally {
            setPartnerLookupLoading(false);
        }
    };

    const handleStartNow = async () => {
        setStartError(null);
        setPartnerLookupError(null);

        if (openSession?.id) {
            setIsStartDrawerOpen(true);
            setStartError('Sie haben bereits eine offene Beratung. Bitte zuerst abschließen.');
            return;
        }

        const referralCode = getCookieValue('referral_code');
        if (referralCode) {
            const agentCode = getCookieValue('agent_code') || undefined;
            clearCookie('agent_code');
            await startSession(agentCode ? { agentCode } : undefined);
            return;
        }

        setIsStartDrawerOpen(true);
    };


    // Auto-start after login when user came via partner link
    useEffect(() => {
        if (!user || didAutostart) return;
        const shouldAutostart = getCookieValue('autostart_session') === '1';
        if (!shouldAutostart) return;
        setDidAutostart(true);
        if (openSession?.id) {
            setIsStartDrawerOpen(true);
            setStartError('Sie haben bereits eine offene Beratung. Bitte zuerst abschließen.');
            return;
        }
        // Require explicit confirmation before starting the onboarding session
        setIsStartDrawerOpen(true);
        const agentCodeFromCookie = getCookieValue('agent_code') || undefined;
        clearCookie('agent_code');
        openWelcomeAndQueueStart(agentCodeFromCookie ? { agentCode: agentCodeFromCookie } : undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, didAutostart]);

    const totalSessions = allSessionsForStats.length;
    const approvedCount = allSessionsForStats.filter(s => s.status === SessionStatus.APPROVED).length;
    const rejectedCount = allSessionsForStats.filter(s => s.status === SessionStatus.REJECTED).length;
    const pendingCount = allSessionsForStats.filter(s => s.status === SessionStatus.PENDING).length;
    const draftCount = allSessionsForStats.filter(s => s.status === SessionStatus.DRAFT).length;

    const navItems = [
        { name: 'Dashboard', href: '/customer/dashboard', icon: LayoutDashboard },
    ];

    const footerItems = [
        { name: 'Abmelden', icon: LogOut, tone: 'danger' as const, onClick: handleLogout },
    ];

    const openSessionRoute = (session: Session) => {
        if (session.status === SessionStatus.DRAFT) {
            router.push('/customer/voice-session/' + session.id);
        }
    };

    // Renders the agent already included in the /api/dashboard payload. No extra fetch.
    const formatAgentName = (session: Session) => {
        const name = `${session.agent?.firstName ?? ''} ${session.agent?.lastName ?? ''}`.trim();
        return name || '—';
    };

    const columnHeaders = (
        <div className="mb-1.5 hidden px-3.5 sm:flex">
            <div className="flex-[1.8] text-[9px] tracking-wider text-text-muted">SITZUNG</div>
            <div className="flex-[1.1] text-[9px] tracking-wider text-text-muted">AGENT</div>
            <div className="flex-[0.8] text-[9px] tracking-wider text-text-muted">STATUS</div>
            <div className="flex-[0.9] text-right text-[9px] tracking-wider text-text-muted">ERSTELLT</div>
        </div>
    );

    return (
        <>
            <Head>
                <title>Dashboard</title>
                <meta name="description" content="Your sessions dashboard" />
            </Head>
            {
                loading ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-base/80 backdrop-blur-sm">
                        <div className="h-16 w-16 animate-spin rounded-full border-2 border-line border-t-accent-primary"></div>
                    </div>
                ) : (
                    <React.Fragment>
                        <DashboardShell
                            title="Dashboard"
                            subtitle={
                                <>
                                    Willkommen zurück,{' '}
                                    <strong className="font-semibold text-text-primary">
                                        {user?.name || user?.email?.split('@')[0] || ''}
                                    </strong>
                                    !
                                </>
                            }
                            navItems={navItems}
                            footerItems={footerItems}
                            headerRight={
                                <DashboardProfilePill
                                    name={user?.name || ''}
                                    email={user?.email || ''}
                                    initial={user?.email?.charAt(0) || ''}
                                    className="max-sm:w-full"
                                />
                            }
                        >
                            <Drawer open={isStartDrawerOpen} onOpenChange={setIsStartDrawerOpen} repositionInputs={false}>
                                <DrawerContent>
                                    <div className="mx-auto w-full max-w-2xl">
                                        <DrawerHeader className="pb-2">
                                            <DrawerTitle className="text-text-primary">Beratung beginnen</DrawerTitle>
                                            <DrawerDescription className="text-text-muted">
                                                Für eine neue Beratung wird ein Partner benötigt.
                                            </DrawerDescription>
                                            {startError && (
                                                <p className="mt-2 text-sm text-status-flagged-fg">{startError}</p>
                                            )}
                                        </DrawerHeader>

                                        <div ref={drawerScrollRef} className="px-4 pb-4 max-h-[65vh] overflow-y-auto sm:max-h-none">
                                        {openSession?.id ? (
                                            <div className="flex flex-col gap-3">
                                                <p className="text-sm text-text-primary">
                                                    Sie haben bereits eine offene Beratung. Bitte zuerst abschließen.
                                                </p>
                                                <button
                                                    onClick={() => router.push('/customer/voice-session/' + openSession.id)}
                                                    className="w-full rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-medium text-text-on-accent transition-colors hover:bg-accent-primary-hov"
                                                >
                                                    Fortsetzen
                                                </button>
                                            </div>
                                        ) : getCookieValue('referral_code') ? (
                                            <div className="flex flex-col gap-3">
                                                <p className="text-sm text-text-primary">Partner-Link erkannt. Sie können direkt starten.</p>
                                                <button
                                                    onClick={() => openWelcomeAndQueueStart()}
                                                    className="w-full rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-medium text-text-on-accent transition-colors hover:bg-accent-primary-hov"
                                                >
                                                    Starten
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="mt-3 flex items-start gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <input
                                                            value={partnerCode}
                                                            onChange={(e) => { setPartnerCode(e.target.value); setPartnerPreview(null); setPartnerLookupError(null); }}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') handleLookupBoth(); }}
                                                            placeholder="Partner-Code"
                                                            className="h-10 w-full rounded-xl border border-line-strong bg-surface-card px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:shadow-focus-ring"
                                                        />
                                                        {partnerLookupError && <p className="mt-1 text-xs text-status-flagged-fg">{partnerLookupError}</p>}
                                                        {partnerPreview && <p className="mt-1 text-xs font-medium text-status-approved-fg">✓ {partnerPreview.firstName} {partnerPreview.lastName}</p>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <input
                                                            value={drawerAgentCode}
                                                            onChange={(e) => { setDrawerAgentCode(e.target.value); setDrawerAgentPreview(null); setDrawerAgentLookupError(null); }}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') handleLookupBoth(); }}
                                                            placeholder="Agenten-Code"
                                                            className="h-10 w-full rounded-xl border border-line-strong bg-surface-card px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:shadow-focus-ring"
                                                        />
                                                        {drawerAgentLookupError && <p className="mt-1 text-xs text-status-flagged-fg">{drawerAgentLookupError}</p>}
                                                        {drawerAgentPreview && <p className="mt-1 text-xs font-medium text-status-approved-fg">✓ {drawerAgentPreview.firstName} {drawerAgentPreview.lastName}</p>}
                                                    </div>
                                                    <button
                                                        onClick={handleLookupBoth}
                                                        disabled={partnerLookupLoading || !partnerCode.trim() || !drawerAgentCode.trim()}
                                                        className={`h-10 shrink-0 rounded-xl px-4 text-sm font-medium transition-colors ${partnerLookupLoading || !partnerCode.trim() || !drawerAgentCode.trim() ? 'cursor-not-allowed bg-surface-raised text-text-muted' : 'border border-line-strong bg-surface-card text-text-primary hover:bg-surface-selected'}`}
                                                    >
                                                        {partnerLookupLoading ? 'Prüfe...' : 'Prüfen'}
                                                    </button>
                                                </div>

                                                {partnerPreview && drawerAgentPreview && (
                                                    <button
                                                        onClick={() => openWelcomeAndQueueStart({ partnerCode: partnerPreview.referralCode, agentCode: drawerAgentPreview.agentCode })}
                                                        className="mt-3 w-full rounded-xl bg-accent-primary px-4 py-2 text-sm font-medium text-text-on-accent transition-colors hover:bg-accent-primary-hov"
                                                    >
                                                        Weiter
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        </div>

                                        <DrawerFooter className="pt-2">
                                            <button
                                                onClick={() => setIsStartDrawerOpen(false)}
                                                className="w-full rounded-xl border border-line-strong bg-surface-card px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-selected"
                                            >
                                                Schließen
                                            </button>
                                        </DrawerFooter>
                                    </div>
                                </DrawerContent>
                            </Drawer>

                            {showOnboardingWelcomePopup && (
                                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-text-primary/40 p-4 backdrop-blur-sm">
                                    <div className="w-full max-w-2xl rounded-2xl bg-surface-card p-5 shadow-overlay sm:p-8">
                                        <h2 className="mb-3 text-lg font-semibold text-text-primary sm:text-xl">
                                            Willkommen bei Digital Onboarding Guide.
                                        </h2>
                                        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1 text-sm text-text-primary sm:text-base">
                                            <p>
                                                Diese Onboarding-Strecke ist der erste Schritt Ihrer Finanzberatung. In den nächsten Schritten erfassen wir gemeinsam relevante Informationen wie Ihre Ziele, Erfahrungen, finanzielle Situation und Risikoneigung. Daraus entsteht ein persönliches Anlegerprofil.
                                            </p>
                                            <p>
                                                Auf Basis dieses Profils wird ein Anlagevorschlag erstellt, der aus konkreten Vermögensverwaltungsstrategien von froots (Asset Management by froots GmbH) besteht. Diese Strategien sind darauf ausgelegt, langfristig und strukturiert zu investieren und werden individuell auf Ihr Profil abgestimmt.
                                            </p>
                                            <p>
                                                Die Anlageberatung und Vermittlung erfolgt durch 4money Financial Services GmbH, die Vermögensverwaltung übernimmt froots (Asset Management by froots GmbH). Ihr Wertpapierdepot wird auf Ihren Namen bei der Schelhammer Capital Bank geführt.
                                            </p>
                                            <p>
                                                Am Ende der Beratungsstrecke steht Ihnen Digital Onboarding Guide – unser digitaler KI-Assistent – zur Verfügung, um Ihre Fragen zu beantworten und Sie bei der Entscheidungsfindung zu unterstützen.
                                            </p>
                                            <p>
                                                Ihre Angaben werden vertraulich behandelt und ausschließlich im Rahmen dieser Beratung verwendet.
                                            </p>
                                        </div>

                                        <div className="mt-5 flex flex-col justify-end gap-3 sm:flex-row">
                                            <button
                                                onClick={() => {
                                                    setShowOnboardingWelcomePopup(false);
                                                    setPendingStartPartnerCode(null);
                                                }}
                                                className="w-full rounded-xl border border-line-strong bg-surface-card px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-selected sm:w-auto"
                                            >
                                                Abbrechen
                                            </button>
                                            <button
                                                onClick={handleWelcomeContinue}
                                                className="w-full rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-medium text-text-on-accent transition-colors hover:bg-accent-primary-hov sm:w-auto"
                                            >
                                                Weiter
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* KPI row — two stacked cards · focal total · two stacked cards */}
                            <div className="mb-8 flex w-full flex-wrap items-stretch gap-3">
                                <div className="flex min-w-0 flex-1 flex-col gap-2.5 max-sm:basis-full max-sm:flex-row max-sm:flex-wrap">
                                    <StatCard
                                        icon={<Hourglass className="h-[18px] w-[18px] text-accent-primary" strokeWidth={1.75} />}
                                        value={pendingCount}
                                        label="Ausstehend"
                                    />
                                    <StatCard
                                        icon={<Clock className="h-[18px] w-[18px] text-status-neutral-fg" strokeWidth={1.75} />}
                                        value={draftCount}
                                        label="Entwurf"
                                    />
                                </div>

                                {/* Signature moment for this surface: one soft accent glow behind the focal metric. */}
                                <div className="relative flex flex-1 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl bg-surface-card p-4 text-center shadow-soft transition-shadow hover:shadow-raised max-sm:order-first max-sm:basis-full">
                                    <div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-x-0 -top-16 h-40 bg-[radial-gradient(ellipse_at_center,rgba(55,124,244,0.14),transparent_70%)]"
                                    />
                                    <div className="relative mb-1 flex h-[34px] w-[34px] items-center justify-center rounded-xl bg-surface-subtle text-accent-primary">
                                        <FileText className="h-4 w-4" strokeWidth={1.75} />
                                    </div>
                                    <div className="relative text-[28px] font-semibold leading-none tabular-nums text-text-primary">
                                        {totalSessions}
                                    </div>
                                    <div className="relative mt-1 text-[11px] text-text-muted">Gesamtsitzungen</div>
                                </div>

                                <div className="flex min-w-0 flex-1 flex-col gap-2.5 max-sm:basis-full max-sm:flex-row max-sm:flex-wrap">
                                    <StatCard
                                        icon={<CheckCircle className="h-[18px] w-[18px] text-status-approved-fg" strokeWidth={1.75} />}
                                        value={approvedCount}
                                        label="Genehmigt"
                                    />
                                    <StatCard
                                        icon={<Ban className="h-[18px] w-[18px] text-status-flagged-fg" strokeWidth={1.75} />}
                                        value={rejectedCount}
                                        label="Abgelehnt"
                                    />
                                </div>
                            </div>

                            <div className="mb-3 text-[15px] font-semibold text-text-primary">Ihre Sitzungen</div>

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

                            {/* Sessions list */}
                            {isLoadingSessions ? (
                                <div>
                                    {columnHeaders}
                                    <div className="flex flex-col gap-2">
                                        {[0, 1, 2].map((i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-2.5 rounded-2xl bg-surface-card p-3.5 shadow-soft"
                                            >
                                                <div className="skeleton-pulse h-[26px] w-[26px] rounded-[9px] bg-surface-raised" />
                                                <div className="skeleton-pulse h-2.5 w-[140px] rounded bg-surface-raised" />
                                                <div className="flex-1" />
                                                <div className="skeleton-pulse h-4 w-[60px] rounded-lg bg-surface-raised" />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-3 text-center text-[11px] text-text-muted">Sitzungen werden geladen...</p>
                                </div>
                            ) : sessionsError ? (
                                <StatePanel
                                    icon={<AlertTriangle className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                                    iconClassName="bg-status-flagged text-status-flagged-fg"
                                    title="Sitzungen konnten nicht geladen werden"
                                    description="Bitte versuchen Sie es erneut."
                                    action={
                                        <button
                                            type="button"
                                            onClick={() => setSessionsReloadKey((k) => k + 1)}
                                            className="mt-3.5 rounded-xl bg-accent-primary px-4 py-2 text-[11px] font-medium text-text-on-accent transition-colors hover:bg-accent-primary-hov"
                                        >
                                            Erneut versuchen
                                        </button>
                                    }
                                />
                            ) : sessions.length === 0 ? (
                                <StatePanel
                                    icon={<FileText className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                                    iconClassName="bg-surface-subtle text-accent-primary"
                                    title={allSessionsForStats.length === 0 ? 'Noch keine Sitzungen' : 'Keine Sitzungen gefunden'}
                                    description={
                                        allSessionsForStats.length === 0
                                            ? 'Ihre Sitzungen erscheinen hier, sobald sie erstellt wurden.'
                                            : 'Versuchen Sie, Ihre Such- oder Filterkriterien anzupassen.'
                                    }
                                />
                            ) : (
                                <div>
                                    {columnHeaders}
                                    <div className="flex flex-col gap-2">
                                        {sessions.map((session) => (
                                            <div
                                                key={session.id}
                                                onClick={() => openSessionRoute(session)}
                                                className="flex cursor-pointer items-center gap-x-2.5 gap-y-1.5 rounded-2xl bg-surface-card p-3.5 shadow-soft transition-shadow hover:shadow-raised max-sm:flex-wrap"
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
                                                <div
                                                    className="min-w-0 flex-[1.1] truncate pr-2 text-xs text-text-primary max-sm:order-4 max-sm:flex-auto max-sm:text-[10px] max-sm:text-text-muted"
                                                    title={formatAgentName(session)}
                                                >
                                                    {formatAgentName(session)}
                                                </div>
                                                <div className="flex-[0.8] max-sm:order-5 max-sm:flex-none">
                                                    <StatusBadge status={session.status} />
                                                </div>
                                                <div className="flex-[0.9] text-right text-[10px] text-text-muted max-sm:order-6 max-sm:flex-1">
                                                    {formatDate(session?.createdAt)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pagination Controls */}
                            {!isLoadingSessions && !sessionsError && totalPages > 1 && (
                                <div className="mt-4 rounded-2xl bg-surface-card px-4 py-3 shadow-soft sm:px-6">
                                    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                                        {/* Page Info */}
                                        <div className="text-xs text-text-muted">
                                            Zeige <span className="font-medium text-text-primary tabular-nums">{indexOfFirstItem + 1}</span> bis{' '}
                                            <span className="font-medium text-text-primary tabular-nums">{Math.min(indexOfLastItem, totalCount)}</span> von{' '}
                                            <span className="font-medium text-text-primary tabular-nums">{totalCount}</span> Ergebnissen
                                        </div>

                                        {/* Pagination Buttons */}
                                        <div className="flex items-center space-x-2">
                                            {/* Previous Button */}
                                            <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${currentPage === 1
                                                    ? 'cursor-not-allowed bg-surface-raised text-text-muted'
                                                    : 'border border-line bg-surface-card text-text-primary hover:bg-surface-selected'
                                                    }`}
                                            >
                                                Zurück
                                            </button>

                                            {/* Page Numbers */}
                                            <div className="hidden sm:flex items-center space-x-1">
                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => {
                                                    // Show first, last, current, and adjacent pages
                                                    if (
                                                        pageNumber === 1 ||
                                                        pageNumber === totalPages ||
                                                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                                                    ) {
                                                        return (
                                                            <button
                                                                key={pageNumber}
                                                                onClick={() => handlePageChange(pageNumber)}
                                                                className={`rounded-xl px-3 py-2 text-xs font-medium tabular-nums transition-colors ${pageNumber === currentPage
                                                                    ? 'bg-accent-primary text-text-on-accent'
                                                                    : 'border border-line bg-surface-card text-text-primary hover:bg-surface-selected'
                                                                    }`}
                                                            >
                                                                {pageNumber}
                                                            </button>
                                                        );
                                                    } else if (
                                                        pageNumber === currentPage - 2 ||
                                                        pageNumber === currentPage + 2
                                                    ) {
                                                        return (
                                                            <span key={pageNumber} className="px-2 text-text-muted">
                                                                ...
                                                            </span>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </div>

                                            {/* Mobile Page Indicator */}
                                            <div className="sm:hidden rounded-xl border border-line bg-surface-card px-3 py-2 text-xs font-medium tabular-nums text-text-primary">
                                                {currentPage} / {totalPages}
                                            </div>

                                            {/* Next Button */}
                                            <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${currentPage === totalPages
                                                    ? 'cursor-not-allowed bg-surface-raised text-text-muted'
                                                    : 'border border-line bg-surface-card text-text-primary hover:bg-surface-selected'
                                                    }`}
                                            >
                                                Weiter
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Spacing so the FAB never covers the last row */}
                            <div className="h-24"></div>
                        </DashboardShell>

                        {/* Floating Action Button */}
                        <button
                            onClick={openSession?.id ? () => router.push('/customer/voice-session/' + openSession.id) : handleStartNow}
                            disabled={false}
                            className="fixed bottom-4 right-4 z-[25] flex cursor-pointer items-center gap-2 rounded-2xl bg-accent-primary px-[18px] py-3 text-xs font-semibold text-text-on-accent shadow-overlay transition-colors hover:bg-accent-primary-hov sm:bottom-7 sm:right-7 sm:px-[22px] sm:py-3.5 sm:text-[13px]"
                        >
                            <Plus className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
                            <span className="hidden sm:inline">{openSession?.id ? 'Beratung fortsetzen' : 'Beratung beginnen'}</span>
                            <span className="sm:hidden">{openSession?.id ? 'Weiter' : 'Beratung beginnen'}</span>
                        </button>
                    </React.Fragment>
                )
            }

        </>
    );
};

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
    action,
}: {
    icon: React.ReactNode;
    iconClassName: string;
    title: string;
    description: string;
    action?: React.ReactNode;
}) => (
    <div className="flex flex-col items-center rounded-2xl bg-surface-card px-5 py-8 text-center shadow-soft">
        <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${iconClassName}`}>{icon}</div>
        <div className="mb-1 text-[13px] font-semibold text-text-primary">{title}</div>
        <div className="max-w-[280px] text-[11px] text-text-muted">{description}</div>
        {action}
    </div>
);

export default Dashboard;
