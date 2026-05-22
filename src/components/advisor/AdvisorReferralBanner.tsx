'use client';

import React from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { Agent } from '@/types';

type Props = {
  referralCode?: string;
  copiedCode: boolean;
  copiedLink: boolean;
  onCopyCode: () => void;
  onCopyLink: () => void;
  agents: Agent[];
  selectedAgentCode: string;
  onAgentChange: (code: string) => void;
};

export default function AdvisorReferralBanner({
  referralCode,
  copiedCode,
  copiedLink,
  onCopyCode,
  onCopyLink,
  agents,
  selectedAgentCode,
  onAgentChange,
}: Props) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const agentParam = selectedAgentCode ? `&agent=${selectedAgentCode}` : '';
  const previewLink = `${origin}/?ref=${referralCode ?? ''}${agentParam}`;

  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 mb-6 text-white">
      <div className="flex flex-col gap-4">
        {/* Header row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Ihr Berater Link
            </h2>
            <p className="text-emerald-100 text-sm mt-1">
              Teilen Sie diesen Link mit Ihren Kunden, um eine Sitzung zu verfolgen
            </p>
          </div>

          {/* Referral code copy */}
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-4 py-2">
            <code className="text-sm font-mono truncate max-w-xs">{referralCode}</code>
            <button
              onClick={onCopyCode}
              className="p-2 bg-white/20 hover:bg-white/30 rounded transition-colors flex-shrink-0"
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Agent selector + link row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Agent dropdown */}
          {agents.length > 0 && (
            <select
              value={selectedAgentCode}
              onChange={(e) => onAgentChange(e.target.value)}
              className="rounded-lg bg-white/20 backdrop-blur border border-white/30 text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/50 sm:w-56 [&>option]:text-gray-800"
            >
              <option value="">Kein Agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.agentCode}>
                  {a.firstName} {a.lastName} ({a.agentCode})
                </option>
              ))}
            </select>
          )}

          {/* Link preview + copy */}
          <div className="flex flex-1 items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-4 py-2 min-w-0">
            <code className="text-sm font-mono truncate flex-1">{previewLink}</code>
            <button
              onClick={onCopyLink}
              className="p-2 bg-white/20 hover:bg-white/30 rounded transition-colors flex-shrink-0"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
