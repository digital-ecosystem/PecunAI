// ── Fee calculation logic. These numbers are compliance-relevant — do not recompute
// differently.
// Moved out of VoiceInvestmentForm.tsx so Phase 4's PTT answer grounding
// (prompts.ts buildPhase4PresentationContext) uses the exact same math the
// screen shows — see private-documents/PHASE_4_PTT_PRESENTATION_CONTEXT_PLAN.md. ──────

export const GEBUEHREN_DATA = [
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

export function getRowEur(row: (typeof GEBUEHREN_DATA)[number], volume: number) {
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
export function getAvgVolume(oneTime: number, monthly: number, years: number): number {
  const annualSavings = monthly * 12;
  return oneTime + annualSavings * years;
}

// Shared fee computation for the desktop table and the mobile cards — one source
// of numbers so the two layouts can never drift apart.
export interface GebuehrenRow {
  label:       string;
  pct:         number | null; // null for fixed fees (table shows "—", cards omit the badge)
  eur1:        number;
  eur2:        number;
  eur10:       number;
  avg:         number;
  description: string;
}

export function computeGebuehren(oneTimeInvestment: number, monthlyInvestment: number) {
  const volumes: number[] = [];
  for (let y = 1; y <= 10; y++) volumes.push(getAvgVolume(oneTimeInvestment, monthlyInvestment, y));

  const rows: GebuehrenRow[] = GEBUEHREN_DATA.map(row => {
    const yearly = volumes.map(vol => getRowEur(row, vol));
    return {
      label:       row.label,
      pct:         "fixed" in row && row.fixed ? null : "pct" in row ? row.pct : null,
      eur1:        yearly[0],
      eur2:        yearly[1],
      eur10:       yearly[9],
      avg:         yearly.reduce((a, b) => a + b, 0) / 10,
      description: row.description,
    };
  });

  const yearlyTotals = volumes.map(vol => GEBUEHREN_DATA.reduce((sum, row) => sum + getRowEur(row, vol), 0));

  // ── Percentage view of the same numbers ──────────────────────────────────
  // The table's "%" column only covers individual percentage-based rows; its totals row shows "—"
  // because no total percentage existed. Phase 4's AI must answer recurring-cost questions in %
  // first (client feedback 2026-07-25, see PHASE_4_COST_ANSWER_FIX_PLAN.md), so the totals are
  // derived here alongside the euro maths rather than in the prompt — one source for both.
  //
  // pctSum alone would understate the real cost: the 0.14% row is clamped to €24–€360 and the
  // Verrechnungskonto fee is flat, so on a small portfolio the effective percentage sits well
  // above the sum of the rates. effPct* divides the actual euro total by that year's average
  // volume and is the honest figure to quote.
  const pctSum   = GEBUEHREN_DATA.reduce((sum, row) => sum + ("fixed" in row && row.fixed ? 0 : "pct" in row ? row.pct : 0), 0);
  const fixedEur = GEBUEHREN_DATA.reduce((sum, row) => sum + ("fixed" in row && row.fixed ? row.fixed : 0), 0);
  const effPct   = yearlyTotals.map((total, i) => (volumes[i] > 0 ? (total / volumes[i]) * 100 : 0));

  return {
    rows,
    jahr1:        yearlyTotals[0],
    jahr2:        yearlyTotals[1],
    jahr10:       yearlyTotals[9],
    durchschnitt: yearlyTotals.reduce((a, b) => a + b, 0) / 10,
    pctSum,
    fixedEur,
    effPct1:            effPct[0],
    effPct2:            effPct[1],
    effPct10:           effPct[9],
    effPctDurchschnitt: effPct.reduce((a, b) => a + b, 0) / 10,
  };
}
