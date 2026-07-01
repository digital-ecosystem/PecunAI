"use client";

import { ShieldCheck } from "lucide-react";

/** Persistent notice shown throughout the silent phases (Personal Info, Signing) —
 *  explains why the AI isn't guiding this part, both on first entry and on resume
 *  (a returning customer never re-hears the spoken privacy-pause announcement). */
export default function PrivacyPauseBanner() {
  return (
    <div className="w-full bg-blue-50 border-b border-blue-100 px-4 py-3 flex items-center gap-3 text-sm text-blue-900">
      <ShieldCheck size={18} className="flex-shrink-0 text-blue-600" />
      <span>
        Aus Datenschutzgründen begleitet Sie unser KI-Berater hier nicht per Sprache — Ihre Angaben werden sicher gespeichert. Sobald Sie fertig sind, ist er wieder für Sie da.
      </span>
    </div>
  );
}
