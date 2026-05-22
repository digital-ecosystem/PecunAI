'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Agent, DashboardQuestions, Session, SessionStatus } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import AdvisorDashboardHeader from '@/components/advisor/AdvisorDashboardHeader';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case SessionStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case SessionStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case SessionStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      case SessionStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case SessionStatus.DRAFT:
        return 'Entwurf';
      case SessionStatus.PENDING:
        return 'Anfrage';
      case SessionStatus.APPROVED:
        return 'Genehmigt';
      case SessionStatus.REJECTED:
        return 'Abgelehnt';
      default:
        return status;
    }
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <AdvisorDashboardHeader
          advisorName={advisor ? `${advisor.firstName} ${advisor.lastName}` : undefined}
          advisorEmail={advisor?.email}
          referralCode={advisor?.referralCode}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
            getStatusColor={getStatusColor}
            getStatusLabel={getStatusLabel}
            onRowClick={(sessionId) => router.push(`/advisor/dashboard/${sessionId}`)}
          />
        </div>

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
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
        />
      </div>

      <div className="hidden">{children}</div>
    </>
  );
}
