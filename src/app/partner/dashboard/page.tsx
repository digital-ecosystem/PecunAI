'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  CheckCircle,
  Clock,
  FileText,
  ChevronRight,
  X,
  Loader2,
  Hourglass,
  Ban,
  Users,
  TrendingUp,
  Link2,
  Copy,
  Check,
} from 'lucide-react';
import { SessionStatus } from '@/types';
import { useRouter } from 'next/navigation';
import PartnerHeader from '@/components/PartnerHeader';

interface PersonalInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  qaSessionId?: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
}

interface Session {
  id: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  phase: string;
  user: User;
  personalInfo?: PersonalInfo;
}

interface Partner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  referralCode: string;
}

const PartnerDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/partner/dashboard', {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();

        if (data?.success) {
          setSessions(data.sessions);
          setPartner(data.partner);
        } else {
          router.push('/partner/signin');
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error);
        router.push('/partner/signin');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session?.personalInfo?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session?.personalInfo?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedSession(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const copyReferralLink = () => {
    if (!partner?.referralCode) return;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const referralLink = `${baseUrl}/?ref=${partner.referralCode}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

    const copyReferralCode = () => {
    if (!partner?.referralCode) return;
    const referralLink = partner.referralCode;
    navigator.clipboard.writeText(referralLink);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PartnerHeader
        partnerName={partner ? `${partner.firstName} ${partner.lastName}` : undefined}
        partnerEmail={partner?.email}
        referralCode={partner?.referralCode}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Referral Link Card */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 mb-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Ihr Partner Link
              </h2>
              <p className="text-emerald-100 text-sm mt-1">
                Teilen Sie diesen Link mit Ihren Kunden, um eine Sitzung zu verfolgen
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-4 py-2">
              <code className="text-sm font-mono truncate max-w-xs">
                {partner?.referralCode}
              </code>
              <button
                onClick={copyReferralCode}
                className="p-2 bg-white/20 hover:bg-white/30 rounded transition-colors flex-shrink-0"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-4 py-2">
              <code className="text-sm font-mono truncate max-w-xs">
                {typeof window !== 'undefined' ? window.location.origin : ''}/?ref=
                {partner?.referralCode}
              </code>
              <button
                onClick={copyReferralLink}
                className="p-2 bg-white/20 hover:bg-white/30 rounded transition-colors flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Empfehlungen</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Genehmigt</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{approvedSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <Ban className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Abgelehnt</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{rejectedSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <Hourglass className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Ausstehend</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{pendingSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Entwurf</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{draftSessions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        {totalSessions > 0 && (
          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Konversionsrate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {((approvedSessions / totalSessions) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                {approvedSessions} von {totalSessions} Empfehlungen genehmigt
              </div>
            </div>
          </div>
        )}

        {/* Sessions Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Search and Filter */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between sm:space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Empfehlungen suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm sm:text-base"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm sm:text-base"
                >
                  <option value="all">Alle Status</option>
                  <option value="DRAFT">Entwurf</option>
                  <option value="PENDING">Ausstehend</option>
                  <option value="REJECTED">Abgelehnt</option>
                  <option value="APPROVED">Genehmigt</option>
                </select>
                <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                  {filteredSessions.length} von {totalSessions} Empfehlungen
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    KUNDE
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    STATUS
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    ERSTELLT
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSessions.map((session) => (
                  <tr
                    key={session.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSessionClick(session)}
                  >
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                          <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {session?.personalInfo?.firstName && session?.personalInfo?.lastName
                              ? `${session.personalInfo.firstName} ${session.personalInfo.lastName}`
                              : 'Unbekannt'}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500 truncate">
                            {session.user.email}
                          </div>
                          <div className="text-xs text-gray-400 sm:hidden mt-1">
                            {formatDate(session.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}
                      >
                        {getStatusLabel(session.status)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                      {formatDate(session.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredSessions.length === 0 && (
            <div className="text-center py-8 sm:py-12 px-4">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-sm sm:text-base text-gray-500">
                {totalSessions === 0
                  ? 'Sie haben noch keine Empfehlungen. Teilen Sie Ihren Empfehlungslink, um zu beginnen!'
                  : 'Keine Empfehlungen gefunden, die Ihren Kriterien entsprechen.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Session Details Drawer */}
      {isDrawerOpen && selectedSession && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-full sm:max-w-md md:max-w-lg bg-white shadow-xl z-50 transform transition-transform overflow-y-auto">
            {/* Drawer Header */}
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    Empfehlungsdetails
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    ID: #{selectedSession.id.slice(0, 8)}...
                  </p>
                </div>
                <button
                  onClick={closeDrawer}
                  className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
              {/* Customer Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
                  Kundeninformationen
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-600">
                      Name
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedSession?.personalInfo?.firstName &&
                      selectedSession?.personalInfo?.lastName
                        ? `${selectedSession.personalInfo.firstName} ${selectedSession.personalInfo.lastName}`
                        : 'Nicht angegeben'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-600">
                      E-Mail
                    </label>
                    <p className="text-sm text-gray-900 break-all">
                      {selectedSession.user.email || ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Session Status */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
                  Sitzungsstatus
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-600">
                      Aktueller Status
                    </label>
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedSession.status)}`}
                    >
                      {getStatusLabel(selectedSession.status)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-600">
                      Erstellungsdatum
                    </label>
                    <p className="text-sm text-gray-900">{formatDate(selectedSession.createdAt)}</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-600">
                      Aktuelle Phase
                    </label>
                    <p className="text-sm text-gray-900">{selectedSession.phase}</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-600">
                      Letzte Aktualisierung
                    </label>
                    <p className="text-sm text-gray-900">{formatDate(selectedSession.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Status Info */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Hinweis</p>
                    <p className="text-sm text-emerald-700 mt-1">
                      Als Partner können Sie den Fortschritt Ihrer Empfehlungen verfolgen. Die
                      endgültige Genehmigung erfolgt durch unser Team.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PartnerDashboard;

