'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, LogOut } from 'lucide-react';
import { Agent, DashboardQuestions, Session, SessionStatus } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import DashboardShell, { DashboardProfilePill } from '@/components/ui/DashboardShell';
import AdvisorReferralBanner from '@/components/advisor/AdvisorReferralBanner';
import DashboardStats from '@/components/advisor/DashboardStats';
import SessionsTable from '@/components/advisor/SessionsTable';
import AdvisorSessionDrawer from '@/components/advisor/AdvisorSessionDrawer';

interface Advisor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  referralCode: string;
}

interface ChatMessage {
  id: string;
  role: 'customer' | 'assistant';
  content: string;
  createdAt: string;
}

export default function AdvisorDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams<{ sessionId?: string }>();
  const sessionIdFromPath = params?.sessionId ?? null;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentCode, setSelectedAgentCode] = useState<string>('');

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [questionAnswer, setQuestionAnswer] = useState<DashboardQuestions[]>([]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isResendingAdvisorLink, setIsResendingAdvisorLink] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/advisor/dashboard', {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();

        if (data?.success) {
          setSessions(data.sessions);
          setAdvisor(data.partner);
        } else {
          router.push('/advisor/signin');
          return;
        }

        const agentsRes = await fetch('/api/advisor/agents', { credentials: 'include' });
        const agentsData = await agentsRes.json();
        if (agentsData?.success) setAgents(agentsData.agents);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
        router.push('/advisor/signin');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const fullname = `${session?.personalInfo?.firstName || ''} ${session?.personalInfo?.lastName || ''}`.trim();
      const matchesSearch =
        session?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fullname.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchTerm, statusFilter]);

  const totalSessions = sessions.length;
  const approvedSessions = sessions.filter((s) => s.status === 'APPROVED').length;
  const draftSessions = sessions.filter((s) => s.status === 'DRAFT').length;
  const pendingSessions = sessions.filter((s) => s.status === 'PENDING').length;
  const rejectedSessions = sessions.filter((s) => s.status === 'REJECTED').length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const copyReferralLink = () => {
    if (!advisor?.referralCode) return;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const agentParam = selectedAgentCode ? `&agent=${selectedAgentCode}` : '';
    const referralLink = `${baseUrl}/?ref=${advisor.referralCode}${agentParam}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyReferralCode = () => {
    if (!advisor?.referralCode) return;
    navigator.clipboard.writeText(advisor.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Relocated verbatim from AdvisorDashboardHeader, whose chrome is now DashboardShell.
  // Same endpoint, same method, same redirect.
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/advisor/logout', {
        method: 'POST',
      });
      await response.json();
      router.push('/advisor/signin');
    } catch (error) {
      console.log('error:', error);
    }
  };

  const closeDrawer = () => {
    setIsChatOpen(false);
    setChatMessages([]);
    setQuestionAnswer([]);
    setSelectedSession(null);
    router.push('/advisor/dashboard');
  };

  const closeChatView = () => {
    setIsChatOpen(false);
    setChatMessages([]);
  };

  const openChatView = async () => {
    if (!selectedSession?.id) return;
    setIsChatLoading(true);
    try {
      const response = await fetch(
        `/api/advisor/dashboard/chat-messages?sessionId=${selectedSession.id}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );
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

  const handleResendAdvisorLink = async (sessionId: string) => {
    setIsResendingAdvisorLink(true);
    try {
      const res = await fetch('/api/signteq/resend-advisor-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!data?.success) {
        alert(data?.error || 'Fehler beim Senden des Signaturlinks');
      }
    } catch (error) {
      console.error('Error resending advisor link:', error);
      alert('Fehler beim Senden des Signaturlinks');
    } finally {
      setIsResendingAdvisorLink(false);
    }
  };

  const handleStatusChange = async (sessionId: string, status: SessionStatus) => {
    setIsStatusUpdating(true);
    try {
      const res = await fetch('/api/advisor/dashboard/user-info/session/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId, status }),
      });

      const data = await res.json();
      if (!data?.success) {
        alert('Failed to update status');
        return;
      }

      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, status } : s)));
      setSelectedSession((prev) => (prev && prev.id === sessionId ? { ...prev, status } : prev));

      setTimeout(() => {
        closeDrawer();
      }, 800);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;

    if (!sessionIdFromPath) {
      setSelectedSession(null);
      setIsChatOpen(false);
      setChatMessages([]);
      setQuestionAnswer([]);
      return;
    }

    const match = sessions.find((s) => s.id === sessionIdFromPath) ?? null;
    if (!match) {
      router.replace('/advisor/dashboard');
      return;
    }

    setSelectedSession(match);
  }, [sessionIdFromPath, sessions, isLoading, router]);

  useEffect(() => {
    if (!selectedSession?.id) return;

    const fetchQuestionAnswer = async () => {
      try {
        const response = await fetch(
          `/api/advisor/dashboard/user-info/questions?sessionId=${selectedSession.id}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );
        const data = await response.json();
        if (data?.success) {
          setQuestionAnswer(data.data);
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    };

    fetchQuestionAnswer();
  }, [selectedSession?.id]);

  const isDrawerOpen = Boolean(sessionIdFromPath && selectedSession);

  // Lifted verbatim from AdvisorDashboardHeader's `navigationItems`.
  const navItems = [{ name: 'Dashboard', href: '/advisor/dashboard', icon: BarChart3 }];
  const footerItems = [
    { name: 'Abmelden', icon: LogOut, tone: 'danger' as const, onClick: handleLogout },
  ];

  const advisorName = advisor ? `${advisor.firstName} ${advisor.lastName}` : undefined;
  const advisorEmail = advisor?.email;

  if (isLoading) {
    return (
      <DashboardShell title="Berater Dashboard" navItems={navItems} footerItems={footerItems}>
        <div className="skeleton-pulse mb-8 h-[108px] w-full rounded-2xl bg-surface-card shadow-soft" />

        <div className="mb-8 flex w-full flex-wrap items-stretch gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 max-sm:basis-full">
            <SkeletonKpiCard />
            <SkeletonKpiCard />
          </div>
          <div className="flex flex-1 items-center justify-center rounded-2xl bg-surface-card p-3.5 shadow-soft max-sm:order-first max-sm:basis-full">
            <div className="skeleton-pulse h-[100px] w-[100px] rounded-full bg-surface-raised" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 max-sm:basis-full">
            <SkeletonKpiCard />
            <SkeletonKpiCard />
          </div>
        </div>

        <div className="mb-3 text-[15px] font-semibold text-text-primary">Ihre Kunden</div>
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
      </DashboardShell>
    );
  }

  return (
    <>
      <DashboardShell
        title="Berater Dashboard"
        subtitle={`Willkommen zurück, ${advisorName || 'Berater'}!`}
        navItems={navItems}
        footerItems={footerItems}
        headerRight={
          <DashboardProfilePill
            name={advisorName || ''}
            email={advisorEmail || 'advisor@example.com'}
            role="Berater"
            initial={advisorName ? advisorName[0].toUpperCase() : 'A'}
            className="max-sm:w-full"
          />
        }
      >
        <AdvisorReferralBanner
          referralCode={advisor?.referralCode}
          copiedCode={copiedCode}
          copiedLink={copied}
          onCopyCode={copyReferralCode}
          onCopyLink={copyReferralLink}
          agents={agents}
          selectedAgentCode={selectedAgentCode}
          onAgentChange={setSelectedAgentCode}
        />

        <DashboardStats
          totalSessions={totalSessions}
          approvedSessions={approvedSessions}
          draftSessions={draftSessions}
          pendingSessions={pendingSessions}
          rejectedSessions={rejectedSessions}
        />

        <SessionsTable
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          filteredSessions={filteredSessions}
          totalSessions={totalSessions}
          formatDate={formatDate}
          onRowClick={(sessionId) => router.push(`/advisor/dashboard/${sessionId}`)}
        />
      </DashboardShell>

      <AdvisorSessionDrawer
        isOpen={isDrawerOpen}
        isStatusUpdating={isStatusUpdating}
        isChatOpen={isChatOpen}
        isChatLoading={isChatLoading}
        selectedSession={selectedSession}
        chatMessages={chatMessages}
        questionAnswer={questionAnswer}
        onCloseDrawer={closeDrawer}
        onCloseChat={closeChatView}
        onOpenChat={openChatView}
        onStatusChange={handleStatusChange}
        onResendAdvisorLink={handleResendAdvisorLink}
        isResendingAdvisorLink={isResendingAdvisorLink}
        formatDate={formatDate}
      />

      <div className="hidden">{children}</div>
    </>
  );
}

const SkeletonKpiCard = () => (
  <div className="flex flex-1 items-center gap-3 rounded-2xl bg-surface-card px-4 py-3.5 shadow-soft">
    <div className="skeleton-pulse h-[18px] w-[18px] rounded bg-surface-raised" />
    <div className="flex-1">
      <div className="skeleton-pulse mb-1 h-3.5 w-[30px] rounded bg-surface-raised" />
      <div className="skeleton-pulse h-2 w-[50px] rounded bg-surface-raised" />
    </div>
  </div>
);
