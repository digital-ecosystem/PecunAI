'use client';

import React from 'react';
import { FileText, Search, Users } from 'lucide-react';
import { Session } from '@/types';

type Props = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  filteredSessions: Session[];
  totalSessions: number;
  formatDate: (dateString: string) => string;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  onRowClick: (sessionId: string) => void;
};

export default function SessionsTable({
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  filteredSessions,
  totalSessions,
  formatDate,
  getStatusColor,
  getStatusLabel,
  onRowClick,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between sm:space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Kunde suchen..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm sm:text-base"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm sm:text-base"
            >
              <option value="all">Alle Status</option>
              <option value="DRAFT">Entwurf</option>
              <option value="PENDING">Ausstehend</option>
              <option value="REJECTED">Abgelehnt</option>
              <option value="APPROVED">Genehmigt</option>
            </select>
            <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
              {filteredSessions.length} von {totalSessions} Kunden
            </span>
          </div>
        </div>
      </div>

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
                onClick={() => onRowClick(session.id)}
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
                      <div className="text-xs sm:text-sm text-gray-500 truncate">{session.user.email}</div>
                      <div className="text-xs text-gray-400 sm:hidden mt-1">{formatDate(session.createdAt)}</div>
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
              ? 'Sie haben noch keine Kunden. Teilen Sie Ihren Empfehlungslink, um zu beginnen!'
              : 'Keine Kunden gefunden, die Ihren Kriterien entsprechen.'}
          </p>
        </div>
      )}
    </div>
  );
}
