'use client';

import { Question } from '@/types';
import { formatEuro } from '@/utils/helper';
import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Info } from 'lucide-react';

function FeeInfoTooltip({ content }: { content: React.ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          aria-label="Mehr Informationen"
        >
          <Info className="w-4 h-4" />
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

const GEBUEHREN_DATA = [
  {
    label: 'Vermögensverwaltungsgebühr p.a. (Asset Management by froots GmbH)',
    pct: 0.39,
    description: 'Laufende Gebühr für die Verwaltung des Portfolios.',
  },
  {
    label: 'Beratungshonorar p.a. (Servicegebühr 4money)',
    pct: 1.11,
    description:
      'Laufende Gebühr für das zur Verfügung stellen von qualifizierten Vor-Ort Beratern. Weiters erhält der Kunde die Möglichkeit die Geeignetheit der vermittelten Veranlagungsstrategie sowie Portfoliostruktur, auf Initiative des Kunden, ein Mal pro Jahr überprüfen zu lassen.',
  },
  {
    label: 'Produktkosten p.a.',
    pct: 0.17,
    description:
      'Laufende Kosten der in der Portfolioverwaltung enthaltenen Wertpapiere (z.B. ETFs oder Investmentfonds). Annahme auf Grund vergangener Erfahrungswerte.',
  },
  {
    label: 'Transaktionskosten p.a. (die Plattform)',
    pct: 0.0,
    description:
      'Spesen der depotführenden Lagerstelle die Plattform für die Durchführung von Transaktionen. Annahme: Weniger als 50 Transaktionen pro Jahr auf Grund vergangener Erfahrungswerte.',
  },
  {
    label: 'Depotgebühr (die Plattform) p.a.',
    pct: 0.24,
    description:
      'Gebühr für Verwahrung/Depotführung bei der depotführenden Lagerstelle die Plattform.',
  },
  {
    label: 'Vermögensverwaltungsabwicklungsgebühr (die Plattform) p.a.',
    pct: 0.14,
    min: 24,
    max: 360,
    description:
      'Abwicklungsgebühr seitens der depotführenden Lagerstelle die Plattform. Mindestens €24,– max. €360,–.',
  },
  {
    label: 'Verrechnungskontogebühr (die Plattform) p.a.',
    fixed: 20.8,
    description:
      'Kontoführungsgebühr für das Verrechnungskonto bei der depotführenden Lagerstelle die Plattform.',
  },
] as const;

function getRowEur(row: (typeof GEBUEHREN_DATA)[number], volume: number) {
  const calcPct = (pct: number) => (volume * pct) / 100;
  const applyMinMax = (val: number) => {
    if ('min' in row && 'max' in row && row.min != null && row.max != null) {
      return Math.max(row.min, Math.min(row.max, val));
    }
    return val;
  };
  if ('fixed' in row && row.fixed) return row.fixed;
  if ('pct' in row) return applyMinMax(calcPct(row.pct));
  return 0;
}

/** Average invested volume: einmalig + (jährliches Sparvolumen × Laufzeit / 2) */
function getAvgVolume(oneTime: number, monthly: number, years: number): number {
  const annualSavings = monthly * 12;
  return oneTime + annualSavings * years;
}

function getEinmaligeKosten(oneTimeInvestment: number, monthlyInvestment: number): number {
  const einmalerlag = oneTimeInvestment > 0 ? oneTimeInvestment * 0.05 : 0;
  const sparplanFee = monthlyInvestment > 0 ? monthlyInvestment * 3 : 0;
  return einmalerlag + sparplanFee;
}

function GebuehrenTable({
  oneTimeInvestment,
  monthlyInvestment,
}: {
  oneTimeInvestment: number;
  monthlyInvestment: number;
}) {
  const vol1 = getAvgVolume(oneTimeInvestment, monthlyInvestment, 1);
  const vol2 = getAvgVolume(oneTimeInvestment, monthlyInvestment, 2);
  const vol10 = getAvgVolume(oneTimeInvestment, monthlyInvestment, 10);

  const einmalig = getEinmaligeKosten(oneTimeInvestment, monthlyInvestment);

  const jahr1 = GEBUEHREN_DATA.reduce((sum, row) => sum + getRowEur(row, vol1), 0);
  const jahr2 = GEBUEHREN_DATA.reduce((sum, row) => sum + getRowEur(row, vol2), 0);
  const jahr10 = GEBUEHREN_DATA.reduce((sum, row) => sum + getRowEur(row, vol10), 0);

  const yearlyFees = [jahr1, jahr2];
  for (let y = 3; y <= 9; y++) {
    const vol = getAvgVolume(oneTimeInvestment, monthlyInvestment, y);
    yearlyFees.push(GEBUEHREN_DATA.reduce((sum, row) => sum + getRowEur(row, vol), 0));
  }
  yearlyFees.push(jahr10);
  const durchschnitt = yearlyFees.reduce((a, b) => a + b, 0) / 10;

  const kostenGesamtJahr1 = jahr1 + einmalig;
  const kostenGesamtJahr2 = jahr2;
  const kostenGesamtJahr10 = jahr10;
  const kostenGesamtDurchschnitt = durchschnitt;

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
            const pctVal = 'fixed' in row && row.fixed ? null : ('pct' in row ? row.pct : null);
            const eur1 = getRowEur(row, vol1);
            const eur2 = getRowEur(row, vol2);
            const eur10 = getRowEur(row, vol10);
            const rowYearlyFees = [eur1, eur2];
            for (let y = 3; y <= 9; y++) {
              const vol = getAvgVolume(oneTimeInvestment, monthlyInvestment, y);
              rowYearlyFees.push(getRowEur(row, vol));
            }
            rowYearlyFees.push(eur10);
            const avg = rowYearlyFees.reduce((a, b) => a + b, 0) / 10;
            const content = <p>{row.description}</p>;
            return (
              <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                <td className="py-2.5 px-3 text-gray-700">{row.label}</td>
                <td className="py-2.5 px-3 text-right text-gray-600 whitespace-nowrap">
                  {typeof pctVal === 'number' ? `${pctVal.toFixed(2)}%` : '—'}
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
          <tr className="bg-gray-50/80 border-t border-gray-200 font-medium">
            <td className="font-bold text-lg py-2.5 px-3 text-gray-900">Kosten gesamt (einmalig + laufend)</td>
            <td className="py-2.5 px-3 text-right text-gray-900 whitespace-nowrap">—</td>
            <td className="py-2.5 px-3 text-right text-gray-900">{formatEuro(kostenGesamtJahr1)}</td>
            <td className="py-2.5 px-3 text-right text-gray-900">{formatEuro(kostenGesamtJahr2)}</td>
            <td className="py-2.5 px-3 text-right text-gray-900">{formatEuro(kostenGesamtJahr10)}</td>
            <td className="py-2.5 px-3 text-right text-gray-900">{formatEuro(kostenGesamtDurchschnitt)}</td>
            <td className="w-8" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

type Portfolio = {
  id?: string;
  from: number;
  to: number;
  risk: string;
  name: string;
  fullName?: string;
  description?: string | null;
  fileName?: string | null;
  riskType?: string;
  aiSettings?: {
    id: string;
    model: string;
    prompt: string;
    vectorId: string | null;
  } | null;
  score?: number;
  sri?: string;
  duration?: number;
};
export default function InvestmentForm(
  {
    investmentFormData,
    handleCheckboxChange,
    suggestedProduct,
    questions,
    answers,
  }: {
    investmentFormData: {
      liquidationRequired: boolean;
      timelyUmschichtung: boolean;
      allConfirmed: boolean;
      dataConsent: boolean;
      confirmationDeclaration: boolean;
      costsDisclosure: boolean;
      liquidityNeeds: boolean;
      additionalLiquidityNeeds: boolean;
    };
    handleCheckboxChange: (field: keyof typeof investmentFormData) => void;
    suggestedProduct: Portfolio | null;
    questions: Question[];
    answers: Record<string, string>;
  }
) {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 lg:min-h-screen min-h-0">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">Ansprechberater Name</p>
            <p className="font-semibold">Anlageprofil</p>
            <p className="text-sm text-gray-600">Digitale Signatur</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-4">Allgemeine Informationen</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">ERSTELLUNGSDATUM</p>
            <p className="font-semibold">
              {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Initiator</p>
            <p className="font-semibold">Vermittler</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">GRUND</p>
            {/* Show answer of 1 question */}
            <p className="font-semibold">
              {
                // Show the option label using answers[questions[0].id]
                questions[0].options.find((option) => option.value === answers[questions[0].id])?.label
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">BERATUNGSORT</p>
            <p className="font-semibold">Online</p>
          </div>
        </div>

        {/* Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          {/*<div>
            <p className="text-xs text-gray-500 mb-1">EINFÜHRUNG IN ANLAGEKLASSEN</p>
            <p className='flex flex-wrap gap-2 font-semibold'>
              {(answers[questions[11].id] !== 'none') && (
                <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs">AKTIEN / AKTIENFONDS</span>
              )}
              {(answers[questions[13].id] !== 'none') && (
                <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs">ANLEIHEN / ANLEIHENFONDS</span>
              )}
              {(answers[questions[15].id] !== 'none') && (
                <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs">EDELMETALLE</span>
              )}
            </p>
          </div>*/}
          <div>
            <p className="text-xs text-gray-500 mb-1">VORHERIGE FINANZDIENSTLEISTUNGEN</p>
            {/* Question No 20 */}
            <p className="font-semibold">
              <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs">
                {
                  answers[questions[17].id] == 'good' || answers[questions[17].id] == 'average' || answers[questions[17].id] == 'experienced_positive' || answers[questions[17].id] == 'experienced_negative' ? 'ANLAGEBERATUNG' : '-'
                }
              </span>
            </p>
          </div>
        </div>

        {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">DEPOT</p>
            <p className="font-semibold">-</p>
          </div>
        </div> */}

        {/* Portfolio Details */}
        {/* <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
            <p className="text-sm font-semibold mb-3 sm:mb-0">VORHERIGE FINANZDIENSTLEISTUNGEN</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={investmentFormData.liquidationRequired}
                  onChange={() => handleCheckboxChange('liquidationRequired')}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <span className="text-gray-700">Zeitlich angemessenes Anlageportfolio</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox"
                  checked={investmentFormData.timelyUmschichtung}
                  onChange={() => handleCheckboxChange('timelyUmschichtung')}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <span className="text-gray-700">Umschichtung für das Eröffnen des Depots nötig</span>
              </label>
            </div>
          </div>
          <span className="inline-block px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs">KEINE AUSREIHUNG</span>
        </div> */}

        {/* Liquiditätsplanung */}
        {/* <div className="mb-6">
          <p className="font-semibold mb-3">Liquiditätsplanung erforderlich</p>
          <label className="flex items-center gap-2 text-sm">
            <input 
              type="checkbox"
              checked={investmentFormData.liquidationRequired}
              onChange={() => handleCheckboxChange('liquidationRequired')}
              className="w-4 h-4 text-teal-600 rounded"
            />
            <span className="text-gray-700">Liquiditätsplanung erforderlich</span>
          </label>
        </div> */}

        {/* Horizontalmanagement */}
        <div className="mb-6">
          <p className="font-semibold mb-3">Horizontmanagement des Anlegerportfolios</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Sehr kurzfristig</p>
              <p className="text-sm">
                {
                  Number(answers[questions[1].id]) <= 1 ? '100%' : '-'
                }
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Kurzfristig</p>
              <p className="text-sm">
                {
                  Number(answers[questions[1].id]) >= 3 && Number(answers[questions[1].id]) <= 5 ? '100%' : '-'
                }
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Mittelfristig</p>
              <p className="text-sm font-semibold">
                {
                  Number(answers[questions[1].id]) > 5 && Number(answers[questions[1].id]) <= 7 ? '100%' : '-'
                }
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Langfristig</p>
              <p className="text-sm">
                {
                  Number(answers[questions[1].id]) > 7 ? '100%' : '-'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Anlageeinsatz */}
        <div className="mb-6">
          <p className="font-semibold mb-3">Anlageansatz</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Einmalige Einzahlung</p>
              <p className="text-sm font-semibold">
                {
                  isNaN(parseFloat(answers[questions[20].id]))
                    ? '0.00 €'
                    : formatEuro(parseFloat(answers[questions[20].id]))
                }
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">monatliche Zahlung</p>
              <p className="text-sm font-semibold">
                {
                  isNaN(parseFloat(answers[questions[21].id]))
                    ? '0.00 €'
                    : formatEuro(parseFloat(answers[questions[21].id] || '0'))
                }
              </p>
            </div>
          </div>
        </div>

        {/* Einmalige Kosten */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Einmalige Kosten</h2>
          <p className="text-sm font-semibold text-gray-700 mb-3">Vermittlungskosten bzw. Eröffnungsgebühr (4money)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Kosten Einmalerlag (5%)</p>
              <p className="text-sm font-semibold">
                {
                  isNaN(parseFloat(answers[questions[20].id])) || parseFloat(answers[questions[20].id]) === 0
                    ? '0.00 €'
                    : formatEuro(parseFloat(answers[questions[20].id]) * 0.05)
                }
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Sparplan Set-up Fee</p>
              <p className="text-sm font-semibold">
                {
                  isNaN(parseFloat(answers[questions[21].id])) || parseFloat(answers[questions[21].id]) === 0
                    ? '0.00 €'
                    : formatEuro(parseFloat(answers[questions[21].id] || '0') * 3)
                }
              </p>
            </div>
          </div>
        </div>

        {/* Laufende Kosten - direkt unter Einmalige Kosten */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Laufende Kosten</h2>
          <GebuehrenTable
            oneTimeInvestment={
              !isNaN(parseFloat(answers[questions[20]?.id] ?? '')) && parseFloat(answers[questions[20]?.id] ?? '') > 0
                ? parseFloat(answers[questions[20]?.id] ?? '')
                : 10000
            }
            monthlyInvestment={
              !isNaN(parseFloat(answers[questions[21]?.id] ?? '')) ? parseFloat(answers[questions[21]?.id] ?? '0') : 0
            }
          />
        </div>

        {/* Investmentprodukte Table */}
        <div className="mb-6">
          <p className="font-semibold mb-3">Investmentprodukte</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-600 p-3 border-b">PRODUKT</th>
                  <th className="text-left text-xs font-semibold text-gray-600 p-3 border-b">VVKN / ISIN</th>
                  <th className="text-left text-xs font-semibold text-gray-600 p-3 border-b">NAME</th>
                  <th className="text-left text-xs font-semibold text-gray-600 p-3 border-b">SRI</th>
                  <th className="text-left text-xs font-semibold text-gray-600 p-3 border-b">ANLAGEZEITRAUM</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 text-sm">
                    {suggestedProduct?.name}
                  </td>
                  <td className="p-3 text-sm">
                    {suggestedProduct?.name || 'N/A'}
                  </td>
                  <td className="p-3 text-sm">{suggestedProduct?.fullName}
                  </td>
                  <td className="p-3 text-sm">
                    {suggestedProduct?.sri || ''}
                  </td>
                  <td className="p-3 text-sm">
                    {suggestedProduct?.duration  || ''} Jahre
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Checkboxes Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {/* <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={investmentFormData.allConfirmed}
              onChange={() => handleCheckboxChange('allConfirmed')}
              className="w-5 h-5 text-teal-600 rounded mt-1 flex-shrink-0"
            />
            <span className="text-sm text-gray-700">Alle bestätigen</span>
          </label> */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={investmentFormData.allConfirmed}
              onChange={() => handleCheckboxChange('allConfirmed')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-900 group-hover:text-teal-600 transition-colors break-words">
              Alle bestätigen
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={investmentFormData.dataConsent}
              onChange={() => handleCheckboxChange('dataConsent')}
              className="w-5 h-5 text-teal-600 rounded mt-1 flex-shrink-0"
            />
            <span className="text-sm text-gray-700 break-words">
              Ich erteile die Einwilligung, dass meine Daten von WPDLU zu Werbezwecken verwendet werden dürfen.
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={investmentFormData.confirmationDeclaration}
              onChange={() => handleCheckboxChange('confirmationDeclaration')}
              className="w-5 h-5 text-teal-600 rounded mt-1 flex-shrink-0"
            />
            <span className="text-sm text-gray-700 break-words">
              Bestätigungserklärung: Ich bestätige alle Hinweise zur Kenntnis genommen zu haben und bestätige die
              Richtigkeit und Vollständigkeit des vorliegenden Kund:innen- und Anleger:innenprofils. Auf Grundlage dieser
              Informationen führt das WPDLU nicht-unabhängige Anlageberatung durch und erteilt Empfehlungen bzgl.
              angemessener bzw. geeigneter Produkte. Die Empfehlungen basieren auf meinen Kenntnissen und
              Erfahrungen im Wertpapierbereich, auf meinen Anlagezielen (angedachte Anlagedauer,
              Ertragserwartungen, Präferenzen bezüglich bestimmter Investments), auf meiner Risikobereitschaft und
              berücksichtigen meine finanziellen Verhältnisse sowie meine Fähigkeit, Verlust zu tragen.
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={investmentFormData.costsDisclosure}
              onChange={() => handleCheckboxChange('costsDisclosure')}
              className="w-5 h-5 text-teal-600 rounded mt-1 flex-shrink-0"
            />
            <span className="text-sm text-gray-700 break-words">
              Ich wurde über die Kosten, des Ausgabeaufschlages in Höhe von einem bis ca. sieben Prozent
              und/oder Set Up Fee und/oder Servicegebühr, entsprechend hingewiesen und aufgeklärt. Des Weiteren ist
              je nach Produktauswahl, z.B. bei geschlossenen Fonds ein höherer Provisionsanteil durch eine zusätzliche
              innere Provision möglich. Die geschätzten Kosten wurden anhand der exante Kostenvoraussschau und den
              aktuellen Anleger:inneninformationen (z. B. Kund:inneninformationsdokument - KID, Wesentliche
              Anleger:inneninformation (WAI), Produktinformationsblatt - PIB, Verbraucherinformationsblatt - VIB)
              ausgewiesen, besprochen und dargelegt.
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={investmentFormData.liquidityNeeds}
              onChange={() => handleCheckboxChange('liquidityNeeds')}
              className="w-5 h-5 text-teal-600 rounded mt-1 flex-shrink-0"
            />
            <span className="text-sm text-gray-700 break-words">
              Ich bestätige, dass kein zusätzlicher Liquiditätsbedarf bei den bestehenden oder neu zu
              investierenden Anlagen besteht. Ich bestätige, dass in der nächsten Zeit kein unmittelbarer
              Liquiditätsbedarf geplant ist.
            </span>
          </label>

          {/*<label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={investmentFormData.additionalLiquidityNeeds}
              onChange={() => handleCheckboxChange('additionalLiquidityNeeds')}
              className="w-5 h-5 text-teal-600 rounded mt-1 flex-shrink-0"
            />
            <span className="text-sm text-gray-700 break-words">
              Der/die Kund:in bestätigt, dass innerhalb des nächsten Jahres zusätzlicher Liquiditätsbedarf gegeben ist
              und dieser in den Angaben zu den Anlagezielen und Anlagedauer bekannt gegeben wurde.
            </span>
          </label>*/}
        </div>

        {/* Navigation Buttons */}
        {/* <div className="flex justify-between mt-8">
          <button className="flex items-center gap-2 px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="font-medium">Zurück</span>
          </button>
          <button className="flex items-center gap-2 px-6 py-3 text-white bg-teal-500 rounded-full hover:bg-teal-600 transition-colors">
            <span className="font-medium">Weiter</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div> */}
      </div>
    </div>
  );
}