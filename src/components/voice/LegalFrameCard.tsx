"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Check, FileText } from "lucide-react";

interface LegalFrameCardProps {
  title:       string;
  subtitle:    string;
  /** 0-based document position — rendered as "N / totalPages". */
  pageIndex:   number;
  totalPages:  number;
  confirmed:   boolean;
  confirming?: boolean;
  onConfirm:   () => void;
  children:    ReactNode;
}

export function LegalFrameCard({
  title,
  subtitle,
  pageIndex,
  totalPages,
  confirmed,
  confirming,
  onConfirm,
  children,
}: LegalFrameCardProps) {
  return (
    <div className="flex h-full w-full flex-col p-5">
      {/* Badge */}
      <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
        {confirmed
          ? <Check className="h-3.5 w-3.5" />
          : <FileText className="h-3.5 w-3.5" />}
        <span>{pageIndex + 1} / {totalPages}</span>
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold leading-snug text-blue-950">
        {title}
      </h2>
      <p className="mt-1 text-xs font-medium leading-5 text-blue-400">
        {subtitle}
      </p>

      {/* Scrollable body */}
      <div className="mt-4 flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 text-sm leading-7 text-slate-700">
        {children}
      </div>

      {/* Confirm button */}
      <motion.button
        className="mt-4 w-full rounded-2xl py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2"
        style={{
          background: confirmed
            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
            : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          boxShadow: confirmed
            ? "0 8px 24px rgba(16,185,129,0.28)"
            : "0 8px 24px rgba(59,130,246,0.28)",
        }}
        whileTap={confirmed ? {} : { scale: 0.97 }}
        disabled={confirming}
        onClick={onConfirm}
      >
        {confirmed ? (
          <>
            <Check size={15} />
            <span>Bestätigt</span>
          </>
        ) : (
          <span>Ich bestätige</span>
        )}
      </motion.button>
    </div>
  );
}

export default LegalFrameCard;
