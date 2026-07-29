import React from 'react';
import { SECTION_CARD_CLASS } from './_shared';

export type DualBarData = { month: string; started: number; completed: number };
export type SingleBarData = { month: string; value: number };

type TrendChartProps =
  | {
      type: 'dual';
      title: string;
      data: DualBarData[];
      legend1?: string;
      legend2?: string;
    }
  | {
      type: 'single';
      title: string;
      data: SingleBarData[];
      legendLabel?: string;
    };

const BAR_CONTAINER = SECTION_CARD_CLASS;

/**
 * The two-tone bar treatment: the leading series is `accent-primary` at 40%,
 * which over the white card resolves to the prototype's `--accent-light`
 * (#AFC9FB) without introducing a token for a one-off tint.
 */
const BAR_LEADING = 'bg-accent-primary/40';
const BAR_TRAILING = 'bg-accent-primary';

function Legend({ swatchClass, label }: { swatchClass: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2.5 w-2.5 rounded-[3px] ${swatchClass}`} />
      <span className="text-[11px] text-text-muted">{label}</span>
    </div>
  );
}

function MonthAxis({ months }: { months: string[] }) {
  return (
    <div className="mt-2 flex">
      {months.map((month, i) => (
        <div key={`${month}-${i}`} className="flex-1 text-center text-[10px] text-text-muted">
          {month}
        </div>
      ))}
    </div>
  );
}

export default function TrendChart(props: TrendChartProps) {
  const { type, title } = props;

  if (type === 'dual') {
    const { data, legend1 = 'Gestartet', legend2 = 'Abgeschlossen' } = props;
    const max = Math.max(...data.flatMap((d) => [d.started, d.completed]), 1);
    const pct = (v: number) => `${Math.round((v / max) * 100)}%`;

    return (
      <div className={BAR_CONTAINER}>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <div className="mt-2 flex gap-4">
          <Legend swatchClass={BAR_LEADING} label={legend1} />
          <Legend swatchClass={BAR_TRAILING} label={legend2} />
        </div>
        <div className="mt-4 flex h-[150px] items-end gap-2">
          {data.map((d, i) => (
            <div key={i} className="flex h-full flex-1 items-end justify-center gap-1.5">
              <div
                className={`min-h-1 w-full max-w-[42px] rounded-t-[3px] transition-all duration-300 ${BAR_LEADING}`}
                style={{ height: pct(d.started) }}
                title={`${legend1}: ${d.started}`}
              />
              <div
                className={`min-h-1 w-full max-w-[42px] rounded-t-[3px] transition-all duration-300 ${BAR_TRAILING}`}
                style={{ height: pct(d.completed) }}
                title={`${legend2}: ${d.completed}`}
              />
            </div>
          ))}
        </div>
        <MonthAxis months={data.map((d) => d.month)} />
      </div>
    );
  }

  const { data, legendLabel = 'Volumen' } = props;
  const max = Math.max(...data.map((d) => d.value), 1);
  const pct = (v: number) => `${Math.round((v / max) * 100)}%`;

  return (
    <div className={BAR_CONTAINER}>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <div className="mt-2 flex gap-4">
        <Legend swatchClass={BAR_TRAILING} label={legendLabel} />
      </div>
      <div className="mt-4 flex h-[150px] items-end gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex h-full flex-1 items-end justify-center">
            <div
              className={`min-h-1 w-full max-w-[52px] rounded-t-[3px] transition-all duration-300 ${BAR_TRAILING}`}
              style={{ height: pct(d.value) }}
              title={`${legendLabel}: ${d.value.toLocaleString('de-AT')}`}
            />
          </div>
        ))}
      </div>
      <MonthAxis months={data.map((d) => d.month)} />
    </div>
  );
}
