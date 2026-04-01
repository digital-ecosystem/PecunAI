'use client';

import React, { useMemo } from 'react';
import { Ban, CheckCircle, Clock, Hourglass, TrendingUp, Users } from 'lucide-react';

type Props = {
  totalSessions: number;
  approvedSessions: number;
  draftSessions: number;
  pendingSessions: number;
  rejectedSessions: number;
};

export default function DashboardStats({
  totalSessions,
  approvedSessions,
  draftSessions,
  pendingSessions,
  rejectedSessions,
}: Props) {
  const conversionRate = useMemo(() => {
    if (totalSessions === 0) return '0.0';
    return ((approvedSessions / totalSessions) * 100).toFixed(1);
  }, [approvedSessions, totalSessions]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Kunden</p>
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

      {totalSessions > 0 && (
        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Konversionsrate</p>
                <p className="text-2xl font-bold text-gray-900">{conversionRate}%</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              {approvedSessions} von {totalSessions} Kunden genehmigt
            </div>
          </div>
        </div>
      )}
    </>
  );
}
