'use client';

import React from 'react';
import { Check, Copy, Link2 } from 'lucide-react';

type Props = {
  referralCode?: string;
  copiedCode: boolean;
  copiedLink: boolean;
  onCopyCode: () => void;
  onCopyLink: () => void;
};

export default function AdvisorReferralBanner({
  referralCode,
  copiedCode,
  copiedLink,
  onCopyCode,
  onCopyLink,
}: Props) {
  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 mb-6 text-white">
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

        <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-4 py-2">
          <code className="text-sm font-mono truncate max-w-xs">{referralCode}</code>
          <button
            onClick={onCopyCode}
            className="p-2 bg-white/20 hover:bg-white/30 rounded transition-colors flex-shrink-0"
          >
            {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-4 py-2">
          <code className="text-sm font-mono truncate max-w-xs">
            {typeof window !== 'undefined' ? window.location.origin : ''}/?ref=
            {referralCode}
          </code>
          <button
            onClick={onCopyLink}
            className="p-2 bg-white/20 hover:bg-white/30 rounded transition-colors flex-shrink-0"
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
