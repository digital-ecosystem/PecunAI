"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Menu, User, Mic } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { HelpCircle } from "lucide-react";
import { AnimatedFrame } from "./AnimatedFrame";
import { formatEuro } from "@/utils/helper";
import type { CarouselQuestion } from "./VoiceCarousel";
import type { ProductData, SessionState } from "@/hooks/useVoiceSession";

// ── Fee calculation logic — copied verbatim from V1's stepper/InvestmentForm.tsx.
// These numbers are compliance-relevant — do not recompute differently. ──────

const GEBUEHREN_DATA = [
  {
    label: "Vermögensverwaltungsgebühr p.a. (Asset Management by froots GmbH)",
    pct: 0.39,
    description: "Laufende Gebühr für die Verwaltung des Portfolios.",
  },
  {
    label: "Beratungshonorar p.a. (Servicegebühr 4money)",
    pct: 1.11,
    description:
      "Laufende Gebühr für das zur Verfügung stellen von qualifizierten Vor-Ort Beratern. Weiters erhält der Kunde die Möglichkeit die Geeignetheit der vermittelten Veranlagungsstrategie sowie Portfoliostruktur, auf Initiative des Kunden, ein Mal pro Jahr überprüfen zu lassen.",
  },
  {
    label: "Produktkosten p.a.",
    pct: 0.17,
    description:
      "Laufende Kosten der in der Portfolioverwaltung enthaltenen Wertpapiere (z.B. ETFs oder Investmentfonds). Annahme auf Grund vergangener Erfahrungswerte.",
  },
  {
    label: "Transaktionskosten p.a. (die Plattform)",
    pct: 0.0,
    description:
      "Spesen der depotführenden Lagerstelle die Plattform für die Durchführung von Transaktionen. Annahme: Weniger als 50 Transaktionen pro Jahr auf Grund vergangener Erfahrungswerte.",
  },
  {
    label: "Depotgebühr (die Plattform) p.a.",
    pct: 0.24,
    description: "Gebühr für Verwahrung/Depotführung bei der depotführenden Lagerstelle die Plattform.",
  },
  {
    label: "Vermögensverwaltungsabwicklungsgebühr (die Plattform) p.a.",
    pct: 0.14,
    min: 24,
    max: 360,
    description: "Abwicklungsgebühr seitens der depotführenden Lagerstelle die Plattform. Mindestens €24,– max. €360,–.",
  },
  {
    label: "Verrechnungskontogebühr (die Plattform) p.a.",
    fixed: 20.8,
    description: "Kontoführungsgebühr für das Verrechnungskonto bei der depotführenden Lagerstelle die Plattform.",
  },
] as const;

function getRowEur(row: (typeof GEBUEHREN_DATA)[number], volume: number) {
  const calcPct = (pct: number) => (volume * pct) / 100;
  const applyMinMax = (val: number) => {
    if ("min" in row && "max" in row && row.min != null && row.max != null) {
      return Math.max(row.min, Math.min(row.max, val));
    }
    return val;
  };
  if ("fixed" in row && row.fixed) return row.fixed;
  if ("pct" in row) return applyMinMax(calcPct(row.pct));
  return 0;
}

/** Average invested volume: einmalig + (jährliches Sparvolumen × Laufzeit / 2) */
function getAvgVolume(oneTime: number, monthly: number, years: number): number {
  const annualSavings = monthly * 12;
  return oneTime + annualSavings * years;
}

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
  const vol1  = getAvgVolume(oneTimeInvestment, monthlyInvestment, 1);
  const vol2  = getAvgVolume(oneTimeInvestment, monthlyInvestment, 2);
  const vol10 = getAvgVolume(oneTimeInvestment, monthlyInvestment, 10);

  const jahr1  = GEBUEHREN_DATA.reduce((sum, row) => sum + getRowEur(row, vol1), 0);
  const jahr2  = GEBUEHREN_DATA.reduce((sum, row) => sum + getRowEur(row, vol2), 0);
  const jahr10 = GEBUEHREN_DATA.reduce((sum, row) => sum + getRowEur(row, vol10), 0);

  const yearlyFees = [jahr1, jahr2];
  for (let y = 3; y <= 9; y++) {
    const vol = getAvgVolume(oneTimeInvestment, monthlyInvestment, y);
    yearlyFees.push(GEBUEHREN_DATA.reduce((sum, row) => sum + getRowEur(row, vol), 0));
  }
  yearlyFees.push(jahr10);
  const durchschnitt = yearlyFees.reduce((a, b) => a + b, 0) / 10;

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
          {GEBUEHREN_DATA.map((row, idx) => {
            const pctVal = "fixed" in row && row.fixed ? null : "pct" in row ? row.pct : null;
            const eur1   = getRowEur(row, vol1);
            const eur2   = getRowEur(row, vol2);
            const eur10  = getRowEur(row, vol10);
            const rowYearlyFees = [eur1, eur2];
            for (let y = 3; y <= 9; y++) {
              const vol = getAvgVolume(oneTimeInvestment, monthlyInvestment, y);
              rowYearlyFees.push(getRowEur(row, vol));
            }
            rowYearlyFees.push(eur10);
            const avg     = rowYearlyFees.reduce((a, b) => a + b, 0) / 10;
            const content = <p>{row.description}</p>;
            return (
              <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                <td className="py-2.5 px-3 text-gray-700">{row.label}</td>
                <td className="py-2.5 px-3 text-right text-gray-600 whitespace-nowrap">
                  {typeof pctVal === "number" ? `${pctVal.toFixed(2)}%` : "—"}
                </td>
                <td className="py-2.5 px-3 text-right text-gray-700">{formatEuro(eur1)}</td>
                <td className="py-2.5 px-3 text-right text-gray-700">{formatEuro(eur2)}</td>
                <td className="py-2.5 px-3 text-right text-gray-700">{formatEuro(eur10)}</td>
                <td className="py-2.5 px-3 text-right text-gray-700">{formatEuro(avg)}</td>
                <td className="py-2.5 px-2">
                  <FeeInfoTooltip content={content} />
                </td>
              </tr>
            );
          })}
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

// ── Checkbox state — same shape and cascade logic as V1's stepper/[session_id]/page.tsx
// (handleCheckboxChange), including the 3 fields with no rendered UI (liquidationRequired,
// timelyUmschichtung, additionalLiquidityNeeds) — kept for exact functional parity. ──────

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

// ── Frame sizing — landscape/table-shaped content, not a PDF's portrait aspect ratio.
// AnimatedFrame's content wrapper uses overflow-hidden, so the fee table/checkboxes inside
// need their own internal overflow-y-auto scroll matching this height. ──────

// Same portrait "document card" proportions as Phase 2's getPdfSize() (VoiceProductPhase.tsx)
// — tall and narrow, matching the vertical, centered feel used everywhere else in the app.
// The fee table scrolls horizontally within its own wrapper if it doesn't fit the width
// (GebuehrenTable already has overflow-x-auto) — consistency with the rest of the UI wins
// over maximizing table width.
function getInvestmentFrameSize() {
  const vw = typeof window !== "undefined" ? window.innerWidth  : 640;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
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
  greeting:    "PecunAI begrüßt Sie...",
  speaking:    "PecunAI spricht",
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
}: VoiceInvestmentFormProps) {
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);
  const [isPTTActive, setIsPTTActive] = useState(false);
  const [formData, setFormData] = useState<InvestmentFormData>(INITIAL_CHECKBOX_STATE);

  useEffect(() => {
    setFrameSize(getInvestmentFrameSize());
    const onResize = () => setFrameSize(getInvestmentFrameSize());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Cascade logic copied verbatim from V1's handleCheckboxChange.
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

  // Same array-index question lookups as V1's InvestmentForm.tsx, kept identical per
  // explicit instruction — this is existing, working functionality, not something to
  // "fix" during the V2 port. See PHASE_4_INVESTMENT_FORM_PLAN.md's ⚠️ section: two of
  // these are confirmed (Q18 = one-time, Q19 = monthly investment), the others carry the
  // same array-index assumption V1 already relies on.
  const reasonLabel = questions[0]?.options?.find(o => o.value === answers[questions[0]?.id])?.label ?? "";
  const durationYears = Number(answers[questions[1]?.id]);
  const oneTimeInvestment = parseFloat(answers[questions[20]?.id] ?? "") || 0;
  const monthlyInvestment = parseFloat(answers[questions[21]?.id] ?? "") || 0;
  const priorExperienceAnswer = answers[questions[17]?.id];
  const hasPriorAdvisoryExperience =
    priorExperienceAnswer === "good" ||
    priorExperienceAnswer === "average" ||
    priorExperienceAnswer === "experienced_positive" ||
    priorExperienceAnswer === "experienced_negative";

  const gebuehrenVolume = oneTimeInvestment > 0 ? oneTimeInvestment : 10000;
  const gebuehrenMonthly = monthlyInvestment > 0 ? monthlyInvestment : 0;

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-x-hidden"
      style={{ background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)" }}
    >
      {/* ── Header — identical structure to VoiceProductPhase ─────── */}
      <div className="w-full px-6 py-5 relative z-10">
        <div className="flex items-center justify-between">
          <motion.button
            className="flex items-center justify-center rounded-full"
            style={{ width: 44, height: 44, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
            whileTap={{ scale: 0.95 }}
          >
            <Menu size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
          </motion.button>

          <motion.h1
            className="text-2xl font-bold tracking-tight"
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Vox.2
          </motion.h1>

          <motion.button
            className="flex items-center justify-center rounded-full"
            style={{ width: 44, height: 44, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
            whileTap={{ scale: 0.95 }}
          >
            <User size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
          </motion.button>
        </div>
      </div>

      {/* ── Scrollable center ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto pb-24 pt-4 md:pt-10 gap-4">
        {frameSize && (
          <div className="w-full flex justify-center">
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <AnimatedFrame
                isSpeaking={isSpeaking}
                isListening={isPTTActive}
                contentWidth={frameSize.width}
                contentHeight={frameSize.height}
              >
                {/* Internal scroll container — AnimatedFrame's content wrapper is overflow-hidden,
                    so this is where actual scrolling happens for content taller than the frame. */}
                <div
                  className="w-full h-full overflow-y-auto p-5 space-y-5"
                  style={{ background: "rgba(255,255,255,0.97)" }}
                >
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

                  {/* Laufende Kosten */}
                  <div>
                    <h2 className="text-base font-bold text-gray-900 mb-2">Laufende Kosten</h2>
                    <GebuehrenTable oneTimeInvestment={gebuehrenVolume} monthlyInvestment={gebuehrenMonthly} />
                  </div>

                  {/* Investmentprodukte */}
                  <div>
                    <p className="font-semibold text-sm mb-2">Investmentprodukte</p>
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
                  </div>

                  {/* Bestätigungs-Checkboxen — same text as V1, verbatim */}
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
              </AnimatedFrame>
            </motion.div>
          </div>
        )}

        {/* ── Bestätigen — same styling as VoiceProductPhase's confirm button ── */}
        {frameSize && (
          <div style={{ width: frameSize.width, marginTop: 10, marginBottom: 32, paddingLeft: 16, paddingRight: 16, boxSizing: "border-box" }}>
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
