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
    <div className="mb-8 w-full rounded-2xl border border-accent-primary bg-surface-card p-4 shadow-soft sm:px-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <Link2 className="h-4 w-4 flex-shrink-0 text-accent-primary" strokeWidth={1.75} />
            Ihr Berater Link
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Teilen Sie diesen Link mit Ihren Kunden, um eine Sitzung zu verfolgen
          </p>
        </div>

        {/* Referral code copy */}
        <button
          type="button"
          onClick={onCopyCode}
          aria-label="Berater-Code kopieren"
          className="flex min-w-0 items-center gap-2 rounded-[10px] bg-surface-selected px-3 py-1.5 text-accent-primary transition-colors hover:bg-surface-raised"
        >
          <code className="truncate font-mono text-xs">{referralCode}</code>
          {copiedCode ? (
            <Check className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
          ) : (
            <Copy className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
          )}
        </button>
      </div>

      {/* Agent selector + link row */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {/* Agent dropdown */}
        {agents.length > 0 && (
          <select
            value={selectedAgentCode}
            onChange={(e) => onAgentChange(e.target.value)}
            className="rounded-[10px] border border-line-strong bg-surface-card px-3 py-2 text-text-primary focus:outline-none focus:shadow-focus-ring sm:w-56"
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
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2.5 rounded-[10px] bg-surface-selected px-3.5 py-2.5">
          <code className="truncate font-mono text-xs text-accent-primary">{previewLink}</code>
          <button
            type="button"
            onClick={onCopyLink}
            aria-label="Berater-Link kopieren"
            className="flex-shrink-0 text-accent-primary transition-colors hover:text-accent-primary-hov"
          >
            {copiedLink ? (
              <Check className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Copy className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
