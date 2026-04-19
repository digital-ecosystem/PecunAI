'use client';

// pages/dashboard.tsx
import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { Agent, Session, SessionStatus, User } from '@/types';
import { Ban, CheckCircle, Clock, FileText, Hourglass, LogOut } from 'lucide-react';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';

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
    const [allSessionsForStats, setAllSessionsForStats] = useState<Session[]>([]);
    const drawerScrollRef = useRef<HTMLDivElement>(null);

    const getCookieValue = (name: string) => {
        if (typeof document === 'undefined') return '';
        const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1')}=([^;]*)`));
        return match ? decodeURIComponent(match[1]) : '';
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
    }, []);

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
                } else {
                    setSessions([]);
                    setTotalPages(0);
                    setTotalCount(0);
                }
            } catch (error) {
                console.error('Error fetching sessions:', error);
                setSessions([]);
            } finally {
                setIsLoadingSessions(false);
            }
        };

        // Debounce search to avoid too many API calls
        const timeoutId = setTimeout(() => {
            fetchSessions();
        }, searchTerm ? 500 : 0);

        return () => clearTimeout(timeoutId);
    }, [currentPage, itemsPerPage, searchTerm, statusFilter]);

    const getStatusBadge = (status: string) => {
        const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
        switch (status) {
            case SessionStatus.APPROVED:
                return `${baseClasses} bg-green-100 text-green-800`;
            case SessionStatus.PENDING:
                return `${baseClasses} bg-yellow-100 text-yellow-800`;
            case SessionStatus.REJECTED:
                return `${baseClasses} bg-red-100 text-red-800`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800`;
        }
    };

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

    const startSession = async (opts?: { partnerCode?: string; agentCode?: string }) => {
        setStartError(null);
        setLoading(true);

        let didNavigate = false;

        try {
            const response = await fetch('/api/qa-session/create', {
                method: 'POST',
                body: JSON.stringify(opts?.partnerCode ? { partnerCode: opts.partnerCode } : {}),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const res = await response.json();

            if (res?.success && res?.session?.id) {
                if (opts?.agentCode) {
                    await fetch('/api/qa-session/agent', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId: res.session.id, agentCode: opts.agentCode }),
                    });
                }
                setIsStartDrawerOpen(false);
                didNavigate = true;
                router.push('/customer/stepper/' + res.session.id);
                return;
            }

            if (response.status === 409 && res?.sessionId) {
                setIsStartDrawerOpen(true);
            }

            if (res?.error === 'PARTNER_REQUIRED' || res?.error === 'PARTNER_INVALID') {
                setIsStartDrawerOpen(true);
            }

            setStartError(res?.message || 'Sitzung konnte nicht erstellt werden');
        } catch (error) {
            console.log('error : ', error)
            setStartError('Sitzung konnte nicht erstellt werden');
        } finally {
            if (!didNavigate) {
                setLoading(false);
            }
        }
    };

    const openWelcomeAndQueueStart = (opts?: { partnerCode?: string; agentCode?: string }) => {
        setIsStartDrawerOpen(false);
        setPendingStartPartnerCode(opts?.partnerCode || null);
        setPendingStartAgentCode(opts?.agentCode || null);
        setShowOnboardingWelcomePopup(true);
    };

    const handleWelcomeContinue = async () => {
        const queuedPartnerCode = pendingStartPartnerCode;
        const queuedAgentCode = pendingStartAgentCode;
        setShowOnboardingWelcomePopup(false);
        setPendingStartPartnerCode(null);
        setPendingStartAgentCode(null);
        await startSession({
            ...(queuedPartnerCode ? { partnerCode: queuedPartnerCode } : {}),
            ...(queuedAgentCode ? { agentCode: queuedAgentCode } : {}),
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
            await startSession();
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
        // Require explicit confirmation before starting the stepper
        setIsStartDrawerOpen(true);
        openWelcomeAndQueueStart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, didAutostart]);

    return (
        <>
            <Head>
                <title>Dashboard</title>
                <meta name="description" content="Your sessions dashboard" />
            </Head>
            {
                loading ? (
                    <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-blue-500"></div>
                    </div>
                ) : (
                    <React.Fragment>
                        <div className="min-h-screen bg-gray-50">
                            {/* Header */}
                            <div className="bg-white shadow-sm border-b border-gray-200">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <div className="py-4 sm:py-6">
                                        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                                            <div className="min-w-0 flex-1">
                                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                                                    Dashboard
                                                </h1>
                                                <p className="mt-1 text-sm text-gray-600 truncate">
                                                    Willkommen zurück, {user?.name || user?.email?.split('@')[0] || ''}!
                                                </p>
                                            </div>
                                            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                                                {/* User Info - Hidden on mobile, shown on larger screens */}
                                                <div className="hidden sm:flex items-center space-x-2">
                                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <span className="text-white font-medium text-sm">
                                                            {user?.email?.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm text-gray-700 truncate max-w-32 lg:max-w-none">
                                                        {user?.email || ''}
                                                    </span>
                                                </div>

                                                {/* Mobile User Info */}
                                                <div className="flex sm:hidden items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                                            <span className="text-white font-medium text-sm">
                                                                {user?.email?.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm text-gray-700 truncate">
                                                            {user?.email || ''}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={handleLogout}
                                                    className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors text-sm font-medium shadow-sm w-full sm:w-auto"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    <span>Abmelden</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

                                <Drawer open={isStartDrawerOpen} onOpenChange={setIsStartDrawerOpen} repositionInputs={false}>
                                    <DrawerContent>
                                        <div className="mx-auto w-full max-w-2xl">
                                            <DrawerHeader className="pb-2">
                                                <DrawerTitle>Beratung beginnen</DrawerTitle>
                                                <DrawerDescription>
                                                    Für eine neue Beratung wird ein Partner benötigt.
                                                </DrawerDescription>
                                                {startError && (
                                                    <p className="mt-2 text-sm text-red-600">{startError}</p>
                                                )}
                                            </DrawerHeader>

                                            <div ref={drawerScrollRef} className="px-4 pb-4 max-h-[65vh] overflow-y-auto sm:max-h-none">
                                            {openSession?.id ? (
                                                <div className="flex flex-col gap-3">
                                                    <p className="text-sm text-gray-700">
                                                        Sie haben bereits eine offene Beratung. Bitte zuerst abschließen.
                                                    </p>
                                                    <button
                                                        onClick={() => router.push('/customer/stepper/' + openSession.id)}
                                                        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                                    >
                                                        Fortsetzen
                                                    </button>
                                                </div>
                                            ) : getCookieValue('referral_code') ? (
                                                <div className="flex flex-col gap-3">
                                                    <p className="text-sm text-gray-700">Partner-Link erkannt. Sie können direkt starten.</p>
                                                    <button
                                                        onClick={() => openWelcomeAndQueueStart()}
                                                        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
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
                                                                className="h-10 w-full px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            />
                                                            {partnerLookupError && <p className="mt-1 text-xs text-red-600">{partnerLookupError}</p>}
                                                            {partnerPreview && <p className="mt-1 text-xs text-green-700 font-medium">✓ {partnerPreview.firstName} {partnerPreview.lastName}</p>}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <input
                                                                value={drawerAgentCode}
                                                                onChange={(e) => { setDrawerAgentCode(e.target.value); setDrawerAgentPreview(null); setDrawerAgentLookupError(null); }}
                                                                onKeyDown={(e) => { if (e.key === 'Enter') handleLookupBoth(); }}
                                                                placeholder="Agenten-Code"
                                                                className="h-10 w-full px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            />
                                                            {drawerAgentLookupError && <p className="mt-1 text-xs text-red-600">{drawerAgentLookupError}</p>}
                                                            {drawerAgentPreview && <p className="mt-1 text-xs text-green-700 font-medium">✓ {drawerAgentPreview.firstName} {drawerAgentPreview.lastName}</p>}
                                                        </div>
                                                        <button
                                                            onClick={handleLookupBoth}
                                                            disabled={partnerLookupLoading || !partnerCode.trim() || !drawerAgentCode.trim()}
                                                            className={`shrink-0 px-4 h-10 rounded-lg text-sm font-medium transition-colors ${partnerLookupLoading || !partnerCode.trim() || !drawerAgentCode.trim() ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`}
                                                        >
                                                            {partnerLookupLoading ? 'Prüfe...' : 'Prüfen'}
                                                        </button>
                                                    </div>

                                                    {partnerPreview && drawerAgentPreview && (
                                                        <button
                                                            onClick={() => openWelcomeAndQueueStart({ partnerCode: partnerPreview.referralCode, agentCode: drawerAgentPreview.agentCode })}
                                                            className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
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
                                                    className="w-full px-4 py-2.5 bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors text-sm font-medium"
                                                >
                                                    Schließen
                                                </button>
                                            </DrawerFooter>
                                        </div>
                                    </DrawerContent>
                                </Drawer>

                                {showOnboardingWelcomePopup && (
                                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-5 sm:p-8">
                                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                                                Willkommen bei PecunAI.
                                            </h2>
                                            <div className="max-h-[60vh] overflow-y-auto pr-1 text-sm sm:text-base text-gray-700 space-y-3">
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
                                                    Am Ende der Beratungsstrecke steht Ihnen PecunAI – unser digitaler KI-Assistent – zur Verfügung, um Ihre Fragen zu beantworten und Sie bei der Entscheidungsfindung zu unterstützen.
                                                </p>
                                                <p>
                                                    Ihre Angaben werden vertraulich behandelt und ausschließlich im Rahmen dieser Beratung verwendet.
                                                </p>
                                            </div>

                                            <div className="mt-5 flex flex-col sm:flex-row justify-end gap-3">
                                                <button
                                                    onClick={() => {
                                                        setShowOnboardingWelcomePopup(false);
                                                        setPendingStartPartnerCode(null);
                                                    }}
                                                    className="w-full sm:w-auto px-4 py-2.5 bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors text-sm font-medium"
                                                >
                                                    Abbrechen
                                                </button>
                                                <button
                                                    onClick={handleWelcomeContinue}
                                                    className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                                >
                                                    Weiter
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
                                    <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                                                <FileText className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs sm:text-sm text-gray-600 truncate">Gesamtsitzungen</p>
                                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{allSessionsForStats.length}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs sm:text-sm text-gray-600 truncate">Genehmigt</p>
                                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{allSessionsForStats.filter(s => s.status === SessionStatus.APPROVED).length}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                                                <Ban className="w-5 h-5 text-red-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs sm:text-sm text-gray-600 truncate">Abgelehnt</p>
                                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{allSessionsForStats.filter(s => s.status === SessionStatus.REJECTED).length}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                                                <Hourglass className="w-5 h-5 text-orange-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs sm:text-sm text-gray-600 truncate">Ausstehend</p>
                                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{allSessionsForStats.filter(s => s.status === SessionStatus.PENDING).length}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                                                <Clock className="w-5 h-5 text-yellow-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs sm:text-sm text-gray-600 truncate">Entwurf</p>
                                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{allSessionsForStats.filter(s => s.status === SessionStatus.DRAFT).length}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Filters and Search */}
                                <div className="mb-6 flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                                    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                                        <div className="relative flex-1 sm:flex-none sm:w-80">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Sitzungen suchen..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            />
                                        </div>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        >
                                            <option value="all">Alle Status</option>
                                            <option value="DRAFT">Entwurf</option>
                                            <option value="PENDING">Anfrage</option>
                                            <option value="REJECTED">Abgelehnt</option>
                                            <option value="APPROVED">Genehmigt</option>
                                        </select>
                                    </div>
                                    <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-right">
                                        <span className="font-medium">{totalCount}</span> von <span className="font-medium">{allSessionsForStats.length}</span> Sitzungen
                                    </div>
                                </div>

                                {/* Sessions Table */}
                                <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                                    {isLoadingSessions ? (
                                        <div className="text-center py-12 px-4">
                                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500 mx-auto mb-4"></div>
                                            <p className="text-sm text-gray-600">Sitzungen werden geladen...</p>
                                        </div>
                                    ) : sessions.length === 0 ? (
                                        <div className="text-center py-12 px-4">
                                            <div className="text-4xl sm:text-6xl mb-4">📚</div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                {allSessionsForStats.length === 0 ? 'Noch keine Sitzungen' : 'Keine Sitzungen gefunden'}
                                            </h3>
                                            <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto">
                                                {allSessionsForStats.length === 0
                                                    ? 'Ihre Sitzungen erscheinen hier, sobald sie erstellt wurden.'
                                                    : 'Versuchen Sie, Ihre Such- oder Filterkriterien anzupassen.'
                                                }
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Desktop Table View */}
                                            <div className="hidden sm:block overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Sitzung
                                                            </th>
                                                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Status
                                                            </th>
                                                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Erstellt
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {sessions.map((session) => (
                                                            <tr key={session.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => {
                                                                if (session.status === SessionStatus.DRAFT) {
                                                                    router.push(`/customer/stepper/${session.id}`);
                                                                }
                                                            }}>
                                                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center">
                                                                        <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                                                                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                                                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                </svg>
                                                                            </div>
                                                                        </div>
                                                                        <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                                                                            <div className="text-sm font-medium text-gray-900 truncate">
                                                                                {session?.personalInfo?.firstName} {session?.personalInfo?.lastName}
                                                                            </div>
                                                                            <div className="text-xs sm:text-sm text-gray-500 truncate">
                                                                                {session.user.email}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                                                    <span className={getStatusBadge(session.status)}>
                                                                        {/* {session.status.replace('_', ' ')} */}
                                                                        {session.status === SessionStatus.DRAFT && (
                                                                            <span className="text-xs text-gray-500">Entwurf</span>
                                                                        )}
                                                                        {session.status === SessionStatus.PENDING && (
                                                                            <span className="text-xs text-gray-500">Anfrage</span>
                                                                        )}
                                                                        {session.status === SessionStatus.REJECTED && (
                                                                            <span className="text-xs text-gray-500">Abgelehnt</span>
                                                                        )}
                                                                        {session.status === SessionStatus.APPROVED && (
                                                                            <span className="text-xs text-gray-500">Genehmigt</span>
                                                                        )}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                    {formatDate(session?.createdAt)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Mobile Card View */}
                                            <div className="sm:hidden divide-y divide-gray-200">
                                                {sessions.map((session) => (
                                                    <div key={session.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => {
                                                        if (session.status === SessionStatus.DRAFT) {
                                                            router.push(`/customer/stepper/${session.id}`);
                                                        }
                                                    }}>
                                                        <div className="flex items-start space-x-3">
                                                            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-sm font-medium text-gray-900 truncate">
                                                                            {session?.personalInfo?.firstName} {session?.personalInfo?.lastName}
                                                                        </p>
                                                                        <p className="text-xs text-gray-500 truncate">
                                                                            {session.user.email}
                                                                        </p>
                                                                    </div>
                                                                    <span className={getStatusBadge(session.status)}>
                                                                        {session.status.replace('_', ' ')}
                                                                    </span>
                                                                </div>
                                                                <div className="mt-2">
                                                                    <p className="text-xs text-gray-500">
                                                                        Erstellt: {formatDate(session?.createdAt)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Pagination Controls */}
                                {!isLoadingSessions && totalPages > 1 && (
                                    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden mt-4">
                                        <div className="px-4 py-3 sm:px-6 bg-gray-50">
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                                {/* Page Info */}
                                                <div className="text-sm text-gray-700">
                                                    Zeige <span className="font-medium">{indexOfFirstItem + 1}</span> bis{' '}
                                                    <span className="font-medium">{Math.min(indexOfLastItem, totalCount)}</span> von{' '}
                                                    <span className="font-medium">{totalCount}</span> Ergebnissen
                                                </div>

                                                {/* Pagination Buttons */}
                                                <div className="flex items-center space-x-2">
                                                    {/* Previous Button */}
                                                    <button
                                                        onClick={() => handlePageChange(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === 1
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
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
                                                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pageNumber === currentPage
                                                                            ? 'bg-blue-600 text-white'
                                                                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
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
                                                                    <span key={pageNumber} className="px-2 text-gray-500">
                                                                        ...
                                                                    </span>
                                                                );
                                                            }
                                                            return null;
                                                        })}
                                                    </div>

                                                    {/* Mobile Page Indicator */}
                                                    <div className="sm:hidden px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
                                                        {currentPage} / {totalPages}
                                                    </div>

                                                    {/* Next Button */}
                                                    <button
                                                        onClick={() => handlePageChange(currentPage + 1)}
                                                        disabled={currentPage === totalPages}
                                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === totalPages
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                                                            }`}
                                                    >
                                                        Weiter
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>                            {/* Spacing for mobile to prevent content overlap with FAB */}
                            <div className="h-24 sm:h-0"></div>

                            {/* Floating Action Button */}
                            <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
                                <button
                                    onClick={openSession?.id ? () => router.push('/customer/stepper/' + openSession.id) : handleStartNow}
                                    className={
                                        'px-4 py-3 sm:px-6 sm:py-3 rounded-full shadow-lg transition-all duration-200 text-sm sm:text-base font-medium ' +
                                        (!openSession?.id
                                            ? 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl transform hover:scale-105'
                                            : 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl transform hover:scale-105')
                                    }
                                    disabled={false}
                                >
                                    <span className="flex items-center space-x-2">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span className="hidden sm:inline">{openSession?.id ? 'Beratung fortsetzen' : 'Beratung beginnen'}</span>
                                        <span className="sm:hidden">{openSession?.id ? 'Weiter' : 'Beratung beginnen'}</span>
                                    </span>
                                </button>
                            </div>
                        </div>
                    </React.Fragment>
                )
            }

        </>
    );
};

export default Dashboard;