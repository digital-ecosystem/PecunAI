import React from 'react';

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

const BAR_CONTAINER = 'bg-white rounded-lg shadow-sm border border-gray-200 p-5';

export default function TrendChart(props: TrendChartProps) {
  const { type, title } = props;

  if (type === 'dual') {
    const { data, legend1 = 'Gestartet', legend2 = 'Abgeschlossen' } = props;
    const max = Math.max(...data.flatMap((d) => [d.started, d.completed]), 1);
    const pct = (v: number) => `${Math.round((v / max) * 100)}%`;

    return (
      <div className={BAR_CONTAINER}>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <div className="mt-2 flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-4 rounded bg-blue-200" />
            <span className="text-xs text-gray-500">{legend1}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-4 rounded bg-blue-600" />
            <span className="text-xs text-gray-500">{legend2}</span>
          </div>
        </div>
        <div className="mt-4 flex h-48 items-end gap-2 rounded-lg bg-gray-50 px-3 pb-3 pt-4">
          {data.map((d, i) => (
            <div key={i} className="flex flex-1 h-full items-end justify-center gap-0.5">
              <div
                className="w-5 min-h-1 rounded-t bg-blue-200 transition-all duration-300"
                style={{ height: pct(d.started) }}
                title={`${legend1}: ${d.started}`}
              />
              <div
                className="w-5 min-h-1 rounded-t bg-blue-600 transition-all duration-300"
                style={{ height: pct(d.completed) }}
                title={`${legend2}: ${d.completed}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex px-3">
          {data.map((d) => (
            <div key={d.month} className="flex-1 text-center text-xs text-gray-400">{d.month}</div>
          ))}
        </div>
      </div>
    );
  }

  const { data, legendLabel = 'Volumen' } = props;
  const max = Math.max(...data.map((d) => d.value), 1);
  const pct = (v: number) => `${Math.round((v / max) * 100)}%`;

  return (
    <div className={BAR_CONTAINER}>
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      <div className="mt-2 flex gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-4 rounded bg-blue-600" />
          <span className="text-xs text-gray-500">{legendLabel}</span>
        </div>
      </div>
      <div className="mt-4 flex h-48 items-end gap-2 rounded-lg bg-gray-50 px-3 pb-3 pt-4">
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 h-full items-end justify-center">
            <div
              className="w-8 min-h-1 rounded-t bg-blue-600 transition-all duration-300"
              style={{ height: pct(d.value) }}
              title={`${legendLabel}: ${d.value.toLocaleString('de-AT')}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex px-3">
        {data.map((d) => (
          <div key={d.month} className="flex-1 text-center text-xs text-gray-400">{d.month}</div>
        ))}
      </div>
    </div>
  );
}
