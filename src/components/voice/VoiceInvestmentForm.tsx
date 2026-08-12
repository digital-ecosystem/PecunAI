"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Q, questionByOrder, answerByOrder, numericAnswerByOrder } from "@/lib/questionRules";
import { motion, useReducedMotion } from "motion/react";
import { Menu, Mic, ArrowLeft } from "lucide-react";
import VoiceProfileMenu from "./VoiceProfileMenu";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { HelpCircle } from "lucide-react";
import { AnimatedFrame } from "./AnimatedFrame";
import { SphereToFrameTransition } from "./SphereToFrameTransition";
import VoiceSphere from "./VoiceSphere";
import type { FrameRect } from "./frameMath";
import { formatEuro } from "@/utils/helper";
import { computeGebuehren } from "@/lib/gebuehren";
import type { CarouselQuestion } from "./VoiceCarousel";
import type { ProductData, SessionState } from "@/hooks/useVoiceSession";

// ── Fee calculation logic (GEBUEHREN_DATA, computeGebuehren) lives in
// src/lib/gebuehren.ts — shared with Phase 4's PTT answer grounding so the
// spoken numbers can never drift from the on-screen table. ──────

function FeeInfoTooltip({ content }: { content: React.ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          aria-label="Mehr Informationen"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={6}
          className="z-50 max-w-xs rounded-lg bg-gray-900 text-white text-sm p-3 shadow-xl data-[state=open]:data-[side=top]:animate-in data-[state=closed]:data-[side=top]:animate-out"
        >
          <div className="leading-relaxed">{content}</div>
          <Popover.Arrow className="fill-gray-900" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function GebuehrenTable({ oneTimeInvestment, monthlyInvestment }: { oneTimeInvestment: number; monthlyInvestment: number }) {
  const { rows, jahr1, jahr2, jahr10, durchschnitt } = computeGebuehren(oneTimeInvestment, monthlyInvestment);

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-200">
            <th className="text-left py-2.5 px-3 font-medium text-gray-600 text-xs">Kosten und Gebühren (inkl. USt.)</th>
            <th className="text-right py-2.5 px-3 font-medium text-gray-600 text-xs w-16">%</th>
            <th className="text-right py-2.5 px-3 font-medium text-gray-600 text-xs w-20">€ Jahr 1</th>
            <th className="text-right py-2.5 px-3 font-medium text-gray-600 text-xs w-20">€ Jahr 2</th>
            <th className="text-right py-2.5 px-3 font-medium text-gray-600 text-xs w-20">€ Jahr 10</th>
            <th className="text-right py-2.5 px-3 font-medium text-gray-600 text-xs w-20">Durchschnitt</th>
            <th className="w-8 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-gray-100 last:border-b-0">
              <td className="py-2.5 px-3 text-gray-700">{row.label}</td>
              <td className="py-2.5 px-3 text-right text-gray-600 whitespace-nowrap">
                {typeof row.pct === "number" ? `${row.pct.toFixed(2)}%` : "—"}
              </td>
              <td className="py-2.5 px-3 text-right text-gray-700">{formatEuro(row.eur1)}</td>
              <td className="py-2.5 px-3 text-right text-gray-700">{formatEuro(row.eur2)}</td>
              <td className="py-2.5 px-3 text-right text-gray-700">{formatEuro(row.eur10)}</td>
              <td className="py-2.5 px-3 text-right text-gray-700">{formatEuro(row.avg)}</td>
              <td className="py-2.5 px-2">
                <FeeInfoTooltip content={<p>{row.description}</p>} />
              </td>
            </tr>
          ))}
          <tr className="bg-gray-50/80 border-t border-gray-200 font-medium">
            <td className="py-2.5 px-3 text-gray-900">Kosten laufend gesamt</td>
            <td className="py-2.5 px-3 text-right text-gray-900 whitespace-nowrap">—</td>
            <td className="py-2.5 px-3 text-right text-gray-900">{formatEuro(jahr1)}</td>
            <td className="py-2.5 px-3 text-right text-gray-900">{formatEuro(jahr2)}</td>
            <td className="py-2.5 px-3 text-right text-gray-900">{formatEuro(jahr10)}</td>
            <td className="py-2.5 px-3 text-right text-gray-900">{formatEuro(durchschnitt)}</td>
            <td className="w-8" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Mobile/tablet replacement for GebuehrenTable — one card per fee, no
 *  horizontal scrolling. Same numbers via computeGebuehren. */
function GebuehrenCards({ oneTimeInvestment, monthlyInvestment }: { oneTimeInvestment: number; monthlyInvestment: number }) {
  const { rows, jahr1, jahr2, jahr10, durchschnitt } = computeGebuehren(oneTimeInvestment, monthlyInvestment);

  const valueGrid = (eur1: number, eur2: number, eur10: number, avg: number, bold?: boolean) => (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
      {[
        ["€ Jahr 1", eur1],
        ["€ Jahr 2", eur2],
        ["€ Jahr 10", eur10],
        ["Durchschnitt", avg],
      ].map(([label, val]) => (
        <div key={label as string} className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] text-gray-500">{label as string}</span>
          <span className={`text-xs ${bold ? "font-bold text-gray-900" : "font-semibold text-gray-800"} tabular-nums`}>
            {formatEuro(val as number)}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-600">Kosten und Gebühren (inkl. USt.)</p>
      {rows.map((row, idx) => (
        <div key={idx} className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-xs font-medium text-gray-800 leading-snug">{row.label}</p>
            <FeeInfoTooltip content={<p>{row.description}</p>} />
          </div>
          {typeof row.pct === "number" && (
            <span
              className="inline-block px-2 py-0.5 mb-2 rounded-full text-[11px] font-medium"
              style={{ background: "rgba(59,130,246,0.08)", color: "rgba(37,99,235,1)" }}
            >
              {row.pct.toFixed(2)}%
            </span>
          )}
          {valueGrid(row.eur1, row.eur2, row.eur10, row.avg)}
        </div>
      ))}
      <div
        className="rounded-lg p-3"
        style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)" }}
      >
        <p className="text-xs font-bold text-gray-900 mb-2">Kosten laufend gesamt</p>
        {valueGrid(jahr1, jahr2, jahr10, durchschnitt, true)}
      </div>
    </div>
  );
}

// ── Checkbox state. Three fields have no rendered UI: liquidationRequired and
// timelyUmschichtung are inert, while additionalLiquidityNeeds still takes part in the
// cascade below. Consequence: allConfirmed can only ever be set by the "accept all"
// checkbox — ticking the four visible boxes individually leaves additionalLiquidityNeeds
// false, so the submit button stays disabled. Deliberate; leave the shape as is. ──────

interface InvestmentFormData {
  liquidationRequired:      boolean;
  timelyUmschichtung:       boolean;
  allConfirmed:             boolean;
  dataConsent:              boolean;
  confirmationDeclaration:  boolean;
  costsDisclosure:          boolean;
  liquidityNeeds:           boolean;
  additionalLiquidityNeeds: boolean;
}

const INITIAL_CHECKBOX_STATE: InvestmentFormData = {
  liquidationRequired:      false,
  timelyUmschichtung:       false,
  allConfirmed:             false,
  dataConsent:              false,
  confirmationDeclaration:  false,
  costsDisclosure:          false,
  liquidityNeeds:           false,
  additionalLiquidityNeeds: false,
};

// ── Frame sizing — AnimatedFrame's content wrapper uses overflow-hidden, so the fee
// table/checkboxes inside need their own internal overflow-y-auto scroll matching this
// height. ──────

// Same portrait "document card" proportions as every other voice-frame phase (a brief
// landscape-desktop experiment was reverted 2026-07-19 on Sibora's call — see
// PHASE_4_FEE_TABLE_RESPONSIVE_PLAN.md). The 7-column fee table therefore scrolls
// horizontally inside its own overflow-x-auto wrapper on desktop, accepted for now;
// below 1024px it's replaced by stacked fee cards (GebuehrenCards) instead.
function getInvestmentFrameSize(footerHeight = 0) {
  const vw = typeof window !== "undefined" ? window.innerWidth  : 640;
  const vh = typeof window !== "undefined" ? window.innerHeight - footerHeight : 800;
  if (vw >= 1024) {
    const maxH = Math.round(vh * 0.68);
    const w    = Math.min(Math.round(maxH / 1.414), 500);
    return { width: w, height: Math.round(w * 1.414) };
  } else if (vw >= 640) {
    const maxH = Math.round(vh * 0.72);
    const w    = Math.min(Math.round(maxH / 1.414), 420);
    return { width: w, height: Math.round(w * 1.414) };
  } else {
    const w = Math.min(Math.round(vw * 0.78), 320);
    return { width: w, height: Math.round(w * 1.414) };
  }
}

const STATUS_LABEL: Record<SessionState, string> = {
  idle:        "Bereit...",
  connecting:  "Verbinde...",
  greeting:    "Digital Onboarding Guide begrüßt Sie...",
  speaking:    "Digital Onboarding Guide spricht",
  listening:   "Zuhören...",
  processing:  "Verarbeite...",
  muted:       "Stumm – tippen Sie Ihre Antwort",
  paused:      "Pausiert...",
  resuming:    "Willkommen zurück...",
  error:       "Verbindungsfehler – Tippen Sie weiter",
};

interface VoiceInvestmentFormProps {
  product:      ProductData;
  questions:    CarouselQuestion[];
  answers:      Record<string, string>;
  isSpeaking:   boolean;
  sessionState: SessionState;
  onPTTStart:   () => void;
  onPTTRelease: () => void;
  onConfirm:    () => void;
  /** One phase back → Phase 3 (Personal Info). Optional; renders a subtle "Zurück" button.
   *  Not gated by the confirmation checkboxes — going back is always allowed. */
  onBack?:      () => void;
  /** The reconnect sphere's centre after the live Phase 3 → 4 handoff. When
   *  set at mount, the entry plays the orb → frame consume morph (same as
   *  Phase 2's product entry). Null on cold resume — content fades in as
   *  before. */
  entryOrbOrigin?: { x: number; y: number } | null;
  /** BACK from Phase 5: the contract-documents frame rect at hand-off. When set at mount, the
   *  entry plays the three-beat mirror of the Phase 4→5 forward morph — that frame collapses to a
   *  sphere, the sphere holds a beat, then it consumes into this form's frame. Takes precedence
   *  over entryOrbOrigin (the two are never set together). */
  entryFrameRect?: FrameRect | null;
  /** Delays the morph start (ms) so the shell's grow-in sphere phantom (the
   *  AI "stepping back in" after the privacy pause) finishes first. */
  entryDelayMs?:   number;
  /** Continuously reports the frame's viewport rect — the shell keeps the
   *  latest value so the Phase 4 → 5 handoff can glide this frame onto the
   *  contract documents screen. */
  onFrameRect?:    (rect: FrameRect) => void;
  /** Actual rendered height of the persistent disclaimer footer (page.tsx, measured live) —
   *  subtracted from window.innerHeight-based sizing here. Defaults to 0. See
   *  private-documents/after-demo/PRIORITY_FIXES_3RD_FEEDBACK_PLAN.md. */
  footerHeight?:   number;
}

export default function VoiceInvestmentForm({
  product,
  questions,
  answers,
  isSpeaking,
  sessionState,
  onPTTStart,
  onPTTRelease,
  onConfirm,
  onBack,
  entryOrbOrigin,
  entryFrameRect,
  entryDelayMs,
  onFrameRect,
  footerHeight = 0,
}: VoiceInvestmentFormProps) {
  const router = useRouter();
  const reduceMotion = !!useReducedMotion();
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);
  const [isPTTActive, setIsPTTActive] = useState(false);
  const [formData, setFormData] = useState<InvestmentFormData>(INITIAL_CHECKBOX_STATE);
  // Below 1024px the frame is too narrow for the 7-column fee table no matter what —
  // those widths swap the tables for stacked cards (GebuehrenCards + product info box).
  const [isCardLayout, setIsCardLayout] = useState(false);

  useEffect(() => {
    const apply = () => {
      setFrameSize(getInvestmentFrameSize(footerHeight));
      setIsCardLayout(window.innerWidth < 1024);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [footerHeight]);

  // ── Entry morph. Two mirror-image modes, never both at once:
  //   • FORWARD P3→P4: orb → form frame (the VoiceProductPhase pattern), optionally delayed by
  //     entryDelayMs so the shell's grow-in sphere phantom finishes first.
  //   • BACK P5→P4: the three-beat mirror of P4→P5 — the contracts frame collapses to a sphere
  //     (toOrb), a real sphere holds a beat (the AI keeps talking), then it consumes into this
  //     frame (toFrame). Copied from VoiceContractDocuments' forward entry.
  // Content stays hidden until whichever morph mostly lands. Reduced motion skips both → fade.
  const [entryOrigin]   = useState(entryOrbOrigin ?? null); // orb→frame origin (forward)
  const [entryStart]    = useState(entryFrameRect ?? null); // 3-beat from-rect (back)
  const [entryCenter]   = useState(() =>
    entryFrameRect && typeof window !== "undefined"
      ? { x: window.innerWidth / 2, y: 84 + (window.innerHeight - footerHeight - 84) / 2 }
      : null
  );
  type EntryStage = "collapse" | "sphere" | "consume" | "done";
  const [entryStage,    setEntryStage]    = useState<EntryStage>(entryFrameRect && !reduceMotion ? "collapse" : "done");
  const [sphereVisible, setSphereVisible] = useState(false);
  const [showTransition, setShowTransition] = useState(!!entryOrbOrigin && !reduceMotion);
  const [revealContent,  setRevealContent]  = useState(reduceMotion || (!entryOrbOrigin && !entryFrameRect));
  const [entryStarted,   setEntryStarted]   = useState(false);
  const [entryRect,      setEntryRect]      = useState<FrameRect | null>(null);
  const contentBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entryOrigin) return;
    const t = setTimeout(() => setEntryStarted(true), entryDelayMs ?? 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!(showTransition || entryStart) || !frameSize) return;
    let raf = 0;
    let attempts = 0;
    const measure = () => {
      const el = contentBoxRef.current;
      if (el) {
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.height > 0) {
          setEntryRect({ x: b.left, y: b.top, w: b.width, h: b.height });
          return;
        }
      }
      attempts += 1;
      if (attempts < 30) raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [showTransition, entryStart, frameSize]);

  // Safety net (forward orb→frame): never leave the screen stuck if the morph can't run.
  useEffect(() => {
    if (!showTransition) return;
    const t = setTimeout(() => {
      setRevealContent(true);
      setShowTransition(false);
    }, 1800 + (entryDelayMs ?? 0));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTransition]);

  // 3-beat (back): hold the real sphere a beat between collapse and consume.
  useEffect(() => {
    if (entryStage !== "sphere") return;
    const t = setTimeout(() => {
      setSphereVisible(false);
      setEntryStage("consume");
    }, 600);
    return () => clearTimeout(t);
  }, [entryStage]);

  // 3-beat (back) safety net: never leave the screen stuck mid-sequence.
  useEffect(() => {
    if (entryStage === "done") return;
    const t = setTimeout(() => {
      setSphereVisible(false);
      setRevealContent(true);
      setEntryStage("done");
    }, 4500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Report the frame's live rect up for the Phase 4 → 5 frame glide — same
  // per-frame poll pattern as VoiceProductPhase (writes a shell ref, no
  // re-renders, tracks scrolling).
  useEffect(() => {
    if (!onFrameRect) return;
    let raf = 0;
    let alive = true;
    const tick = () => {
      const el = contentBoxRef.current;
      if (el) {
        const b = el.getBoundingClientRect();
        if (b.width > 0) onFrameRect({ x: b.left, y: b.top, w: b.width, h: b.height });
      }
      if (alive) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [onFrameRect]);

  const handleCheckboxChange = useCallback((field: keyof InvestmentFormData) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: !prev[field] };

      if (field === "allConfirmed") {
        const newValue = !prev.allConfirmed;
        return {
          ...updated,
          dataConsent:              newValue,
          confirmationDeclaration:  newValue,
          costsDisclosure:          newValue,
          liquidityNeeds:           newValue,
          additionalLiquidityNeeds: newValue,
          allConfirmed:             newValue,
        };
      }

      const allChecked =
        updated.dataConsent &&
        updated.confirmationDeclaration &&
        updated.costsDisclosure &&
        updated.liquidityNeeds &&
        updated.additionalLiquidityNeeds;

      if (allChecked) {
        updated.allConfirmed = true;
      } else if (updated.allConfirmed) {
        updated.allConfirmed = false;
      }

      return updated;
    });
  }, []);

  const statusLabel = STATUS_LABEL[sessionState] ?? "";

  // Looked up by questionOrder, never by array position. The questions API returns answered
  // questions first, so positions shift per customer — which is exactly how a €100 monthly
  // plan rendered as 0,00 €. See questionRules.ts for the full account.
  const reasonQ = questionByOrder(questions, Q.REASON);
  const reasonLabel = reasonQ?.options?.find(o => o.value === answers[reasonQ.id])?.label ?? "";
  const durationYears = Number(answerByOrder(questions, answers, Q.DURATION_YEARS));
  const oneTimeInvestment = numericAnswerByOrder(questions, answers, Q.ONE_TIME_INVESTMENT);
  const monthlyInvestment = numericAnswerByOrder(questions, answers, Q.MONTHLY_INVESTMENT);
  const priorExperienceAnswer = answerByOrder(questions, answers, Q.PRIOR_EXPERIENCE);
  const hasPriorAdvisoryExperience =
    priorExperienceAnswer === "good" ||
    priorExperienceAnswer === "average" ||
    priorExperienceAnswer === "experienced_positive" ||
    priorExperienceAnswer === "experienced_negative";

  // ⚠️ The €10,000 stand-in is retained ON PURPOSE for now. It presents the running-cost
  // table for a portfolio the customer never entered — on a €100/month plan that shows an
  // effective 2.31 % p.a. where the true year-1 figure is 5.64 %, because €44.80 of
  // non-scaling fees (the €24 minimum plus the €20.80 flat account fee) are being divided
  // by €11,200 instead of €1,200. Removing it is a change to a compliance-relevant
  // disclosure, so it is being put to the client separately rather than shipped alongside
  // this bug fix. Until then the displayed cost figures are unchanged from V1.
  const gebuehrenVolume = oneTimeInvestment > 0 ? oneTimeInvestment : 10000;
  const gebuehrenMonthly = monthlyInvestment > 0 ? monthlyInvestment : 0;

  return (
    <div
      className="h-full flex flex-col relative overflow-x-hidden"
      style={{ background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)" }}
    >
      {/* ── Header — identical structure to VoiceProductPhase ─────── */}
      <div className="w-full px-6 py-5 relative z-10">
        <div className="flex items-center justify-between">
          {onBack ? (
            <motion.button
              className="flex items-center justify-center rounded-full"
              style={{ width: 44, height: 44, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              aria-label="Einen Schritt zurück"
            >
              <ArrowLeft size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
            </motion.button>
          ) : <div style={{ width: 44, height: 44 }} />}

          <motion.h1
            className="text-2xl font-bold tracking-tight"
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Vox.2
          </motion.h1>

          <div className="flex items-center gap-2">
            <motion.button
              className="flex items-center justify-center rounded-full"
              style={{ width: 44, height: 44, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/customer/dashboard")}
              aria-label="Zum Dashboard"
            >
              <Menu size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
            </motion.button>
            <VoiceProfileMenu />
          </div>
        </div>
      </div>

      {/* Entry morph — the returning sphere's nodes fly onto the form's frame
          and the dense web materializes around it, while the real frame below
          stays hidden until onMostlyDone. */}
      {showTransition && entryOrigin && entryRect && entryStarted && (
        <SphereToFrameTransition
          sphereCenter={entryOrigin}
          sphereRadius={380 * 0.3}
          contentRect={entryRect}
          onMostlyDone={() => setRevealContent(true)}
          onComplete={() => setShowTransition(false)}
        />
      )}

      {/* BACK 3-beat, beat 1 — the contracts frame collapses into the sphere. */}
      {entryStage === "collapse" && entryStart && entryCenter && (
        <SphereToFrameTransition
          direction="toOrb"
          sphereCenter={entryCenter}
          sphereRadius={380 * 0.3}
          contentRect={entryStart}
          onMostlyDone={() => setSphereVisible(true)}
          onComplete={() => setEntryStage("sphere")}
        />
      )}

      {/* BACK 3-beat, beat 3 — the sphere consumes into this form's frame. */}
      {entryStage === "consume" && entryRect && entryCenter && (
        <SphereToFrameTransition
          sphereCenter={entryCenter}
          sphereRadius={380 * 0.3}
          contentRect={entryRect}
          onMostlyDone={() => setRevealContent(true)}
          onComplete={() => setEntryStage("done")}
        />
      )}

      {/* BACK 3-beat, beat 2 — the real sphere holds centre stage, pulsing while the AI
          re-introduces the costs. Fades in under the dissolving collapse canvas. */}
      {sphereVisible && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center"
          style={{ paddingTop: 84 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <VoiceSphere
            isActive
            isSpeaking={isSpeaking}
            isListening={false}
            size={380}
            analyserNode={null}
            micAnalyserNode={null}
          />
        </motion.div>
      )}

      {/* ── Scrollable center ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto pb-24 pt-4 md:pt-10 gap-4">
        {frameSize && (
          <div className="w-full flex justify-center">
            <motion.div
              ref={contentBoxRef}
              className="relative"
              // Morph path stays at scale 1 while hidden — the measured rect is
              // the morph's landing target and transforms would shrink it.
              initial={{ opacity: 0, scale: (entryOrigin || entryStart) ? 1 : 0.96 }}
              animate={{ opacity: revealContent ? 1 : 0, scale: revealContent || entryOrigin || entryStart ? 1 : 0.96 }}
              transition={{ duration: 0.5, delay: revealContent && !entryOrigin && !entryStart ? 0.15 : 0 }}
            >
              <AnimatedFrame
                isSpeaking={isSpeaking}
                isListening={isPTTActive}
                contentWidth={frameSize.width}
                contentHeight={frameSize.height}
              >
                {/* LegalFrameCard-style split: scrollable body + confirm button fixed at the
                    card's bottom (inside the frame, per Sibora 2026-07-19). AnimatedFrame's
                    content wrapper is overflow-hidden, so the body owns the actual scrolling. */}
                <div
                  className="w-full h-full flex flex-col"
                  style={{ background: "rgba(255,255,255,0.97)" }}
                >
                <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
                  {/* Allgemeine Informationen */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">GRUND</p>
                    <p className="font-semibold text-sm mb-3">{reasonLabel}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">ERSTELLUNGSDATUM</p>
                        <p className="font-semibold text-sm">
                          {new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">BERATUNGSORT</p>
                        <p className="font-semibold text-sm">Online</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">VORHERIGE FINANZDIENSTLEISTUNGEN</p>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                        {hasPriorAdvisoryExperience ? "ANLAGEBERATUNG" : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Horizontmanagement */}
                  <div>
                    <p className="font-semibold text-sm mb-2">Horizontmanagement des Anlegerportfolios</p>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Sehr kurzfristig</p>
                        <p className="text-sm">{durationYears <= 1 ? "100%" : "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Kurzfristig</p>
                        <p className="text-sm">{durationYears >= 3 && durationYears <= 5 ? "100%" : "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Mittelfristig</p>
                        <p className="text-sm font-semibold">{durationYears > 5 && durationYears <= 7 ? "100%" : "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Langfristig</p>
                        <p className="text-sm">{durationYears > 7 ? "100%" : "-"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Anlageansatz */}
                  <div>
                    <p className="font-semibold text-sm mb-2">Anlageansatz</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Einmalige Einzahlung</p>
                        <p className="text-sm font-semibold">{formatEuro(oneTimeInvestment)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">monatliche Zahlung</p>
                        <p className="text-sm font-semibold">{formatEuro(monthlyInvestment)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Einmalige Kosten */}
                  <div>
                    <h2 className="text-base font-bold text-gray-900 mb-2">Einmalige Kosten</h2>
                    <p className="text-xs font-semibold text-gray-700 mb-2">Vermittlungskosten bzw. Eröffnungsgebühr (4money)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Kosten Einmalerlag (5%)</p>
                        <p className="text-sm font-semibold">{formatEuro(oneTimeInvestment * 0.05)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Sparplan Set-up Fee</p>
                        <p className="text-sm font-semibold">{formatEuro(monthlyInvestment * 3)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Laufende Kosten — table on desktop (wide frame), cards below 1024px */}
                  <div>
                    <h2 className="text-base font-bold text-gray-900 mb-2">Laufende Kosten</h2>
                    {isCardLayout ? (
                      <GebuehrenCards oneTimeInvestment={gebuehrenVolume} monthlyInvestment={gebuehrenMonthly} />
                    ) : (
                      <GebuehrenTable oneTimeInvestment={gebuehrenVolume} monthlyInvestment={gebuehrenMonthly} />
                    )}
                  </div>

                  {/* Investmentprodukte — same split: table on desktop, info box on card layout */}
                  <div>
                    <p className="font-semibold text-sm mb-2">Investmentprodukte</p>
                    {isCardLayout ? (
                      <div className="border border-gray-200 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Produkt</p>
                          <p className="text-xs text-gray-800">{product.name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Name</p>
                          <p className="text-xs text-gray-800">{product.fullName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-0.5">SRI</p>
                          <p className="text-xs text-gray-800">{product.sri}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Anlagezeitraum</p>
                          <p className="text-xs text-gray-800">{product.from}–{product.to} Jahre</p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="text-left font-semibold text-gray-600 p-2 border-b">PRODUKT</th>
                            <th className="text-left font-semibold text-gray-600 p-2 border-b">NAME</th>
                            <th className="text-left font-semibold text-gray-600 p-2 border-b">SRI</th>
                            <th className="text-left font-semibold text-gray-600 p-2 border-b">ANLAGEZEITRAUM</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-2">{product.name}</td>
                            <td className="p-2">{product.fullName}</td>
                            <td className="p-2">{product.sri}</td>
                            <td className="p-2">{product.from}–{product.to} Jahre</td>
                          </tr>
                        </tbody>
                      </table>
                      </div>
                    )}
                  </div>

                  {/* Bestätigungs-Checkboxen — compliance-approved wording, do not reword */}
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.allConfirmed}
                        onChange={() => handleCheckboxChange("allConfirmed")}
                        className="w-5 h-5 text-blue-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        Alle bestätigen
                      </span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.dataConsent}
                        onChange={() => handleCheckboxChange("dataConsent")}
                        className="w-5 h-5 text-blue-600 rounded mt-1 flex-shrink-0"
                      />
                      <span className="text-xs text-gray-700">
                        Ich erteile die Einwilligung, dass meine Daten von WPDLU zu Werbezwecken verwendet werden dürfen.
                      </span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.confirmationDeclaration}
                        onChange={() => handleCheckboxChange("confirmationDeclaration")}
                        className="w-5 h-5 text-blue-600 rounded mt-1 flex-shrink-0"
                      />
                      <span className="text-xs text-gray-700">
                        Bestätigungserklärung: Ich bestätige alle Hinweise zur Kenntnis genommen zu haben und bestätige die
                        Richtigkeit und Vollständigkeit des vorliegenden Kund:innen- und Anleger:innenprofils. Auf Grundlage
                        dieser Informationen führt das WPDLU nicht-unabhängige Anlageberatung durch und erteilt Empfehlungen
                        bzgl. angemessener bzw. geeigneter Produkte. Die Empfehlungen basieren auf meinen Kenntnissen und
                        Erfahrungen im Wertpapierbereich, auf meinen Anlagezielen (angedachte Anlagedauer, Ertragserwartungen,
                        Präferenzen bezüglich bestimmter Investments), auf meiner Risikobereitschaft und berücksichtigen meine
                        finanziellen Verhältnisse sowie meine Fähigkeit, Verlust zu tragen.
                      </span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.costsDisclosure}
                        onChange={() => handleCheckboxChange("costsDisclosure")}
                        className="w-5 h-5 text-blue-600 rounded mt-1 flex-shrink-0"
                      />
                      <span className="text-xs text-gray-700">
                        Ich wurde über die Kosten, des Ausgabeaufschlages in Höhe von einem bis ca. sieben Prozent und/oder
                        Set Up Fee und/oder Servicegebühr, entsprechend hingewiesen und aufgeklärt. Des Weiteren ist je nach
                        Produktauswahl, z.B. bei geschlossenen Fonds ein höherer Provisionsanteil durch eine zusätzliche
                        innere Provision möglich. Die geschätzten Kosten wurden anhand der exante Kostenvoraussschau und den
                        aktuellen Anleger:inneninformationen (z. B. Kund:inneninformationsdokument - KID, Wesentliche
                        Anleger:inneninformation (WAI), Produktinformationsblatt - PIB, Verbraucherinformationsblatt - VIB)
                        ausgewiesen, besprochen und dargelegt.
                      </span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.liquidityNeeds}
                        onChange={() => handleCheckboxChange("liquidityNeeds")}
                        className="w-5 h-5 text-blue-600 rounded mt-1 flex-shrink-0"
                      />
                      <span className="text-xs text-gray-700">
                        Ich bestätige, dass kein zusätzlicher Liquiditätsbedarf bei den bestehenden oder neu zu
                        investierenden Anlagen besteht. Ich bestätige, dass in der nächsten Zeit kein unmittelbarer
                        Liquiditätsbedarf geplant ist.
                      </span>
                    </label>
                  </div>
                </div>

                {/* ── Bestätigen — inside the frame, LegalFrameCard-style footer ── */}
                <div className="flex-shrink-0 px-5 pb-4 pt-3 border-t border-gray-100">
                  <motion.button
                    className="w-full text-sm font-semibold rounded-2xl text-white py-3"
                    style={{
                      background: formData.allConfirmed
                        ? "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)"
                        : "rgba(148,163,184,0.3)",
                      color:     formData.allConfirmed ? "white" : "rgba(100,116,139,0.5)",
                      boxShadow: formData.allConfirmed ? "0 4px 16px rgba(59,130,246,0.35)" : "none",
                    }}
                    whileTap={formData.allConfirmed ? { scale: 0.97 } : {}}
                    onClick={onConfirm}
                    disabled={!formData.allConfirmed}
                  >
                    Bestätigen
                  </motion.button>
                </div>
                </div>
              </AnimatedFrame>
            </motion.div>
          </div>
        )}

        {/* Status label, matching Phase 0 intro's placement/style */}
        <p className="text-sm font-medium" style={{ color: "rgba(59,130,246,0.7)" }}>
          {statusLabel}
        </p>
      </div>

      {/* ── PTT button — fixed bottom-right, identical to VoiceProductPhase ── */}
      <div className="fixed bottom-8 right-6 flex flex-col items-center gap-2 z-[60]">
        {!isPTTActive && !isSpeaking && (
          <p className="text-xs font-medium text-center" style={{ color: "rgba(59,130,246,0.7)" }}>
            Halten zum<br />Sprechen
          </p>
        )}
        <motion.button
          className="flex items-center justify-center rounded-full shadow-xl border-2 ptt-button"
          style={{
            width: 64, height: 64,
            background: isPTTActive
              ? "linear-gradient(135deg, rgba(37,99,235,1) 0%, rgba(29,78,216,1) 100%)"
              : "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
            borderColor: isPTTActive ? "rgba(29,78,216,0.8)" : "rgba(59,130,246,0.3)",
          }}
          animate={isPTTActive ? { scale: [0.93, 0.96, 0.93] } : { scale: 1 }}
          transition={isPTTActive ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : {}}
          onMouseDown={() => { setIsPTTActive(true); onPTTStart(); }}
          onMouseUp={() => { setIsPTTActive(false); onPTTRelease(); }}
          onMouseLeave={isPTTActive ? () => { setIsPTTActive(false); onPTTRelease(); } : undefined}
          onTouchStart={() => { setIsPTTActive(true); onPTTStart(); }}
          onTouchEnd={() => { setIsPTTActive(false); onPTTRelease(); }}
          onTouchCancel={() => { setIsPTTActive(false); onPTTRelease(); }}
        >
          <Mic className="text-white" size={26} />
        </motion.button>
      </div>
    </div>
  );
}
