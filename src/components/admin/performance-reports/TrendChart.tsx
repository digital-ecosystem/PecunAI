import React from 'react';

type DualBarData = { month: string; started: number; completed: number };
type SingleBarData = { month: string; value: number };

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

export default function TrendChart(props: TrendChartProps) {
  const { type, title, data } = props;

  const max =
    type === 'dual'
      ? Math.max(...(data as DualBarData[]).flatMap((d) => [d.started, d.completed]))
      : Math.max(...(data as SingleBarData[]).map((d) => d.value));

  const pct = (v: number) => `${Math.round((v / max) * 100)}%`;

  const legend1 = type === 'dual' && 'legend1' in props ? props.legend1 ?? 'Gestartet' : 'Gestartet';
  const legend2 = type === 'dual' && 'legend2' in props ? props.legend2 ?? 'Abgeschlossen' : 'Abgeschlossen';
  const legendLabel = type === 'single' && 'legendLabel' in props ? props.legendLabel ?? 'Volumen' : 'Volumen';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>

      {/* Legend */}
      <div className="mt-2 flex gap-4">
        {type === 'dual' ? (
          <>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-4 rounded bg-blue-200" />
              <span className="text-xs text-gray-500">{legend1}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-4 rounded bg-blue-600" />
              <span className="text-xs text-gray-500">{legend2}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-4 rounded bg-blue-600" />
            <span className="text-xs text-gray-500">{legendLabel}</span>
          </div>
        )}
      </div>

      {/* Bars */}
      <div className="mt-4 flex h-48 items-end gap-2 rounded-lg bg-gray-50 px-3 pb-3 pt-4">
        {type === 'dual'
          ? (data as DualBarData[]).map((d, i) => (
              <div key={i} className="flex flex-1 items-end justify-center gap-0.5">
                <div
                  className="w-5 min-h-1 rounded-t bg-blue-200 transition-all duration-300"
                  style={{ height: pct(d.started) }}
                  title={`Gestartet: ${d.started}`}
                />
                <div
                  className="w-5 min-h-1 rounded-t bg-blue-600 transition-all duration-300"
                  style={{ height: pct(d.completed) }}
                  title={`Abgeschlossen: ${d.completed}`}
                />
              </div>
            ))
          : (data as SingleBarData[]).map((d, i) => (
              <div key={i} className="flex flex-1 items-end justify-center">
                <div
                  className="w-8 min-h-1 rounded-t bg-blue-600 transition-all duration-300"
                  style={{ height: pct(d.value) }}
                  title={`Volumen: ${d.value.toLocaleString('de-AT')}`}
                />
              </div>
            ))}
      </div>

      {/* Month labels */}
      <div className="mt-1.5 flex px-3">
        {type === 'dual'
          ? (data as DualBarData[]).map((d) => (
              <div key={d.month} className="flex-1 text-center text-xs text-gray-400">
                {d.month}
              </div>
            ))
          : (data as SingleBarData[]).map((d) => (
              <div key={d.month} className="flex-1 text-center text-xs text-gray-400">
                {d.month}
              </div>
            ))}
      </div>
    </div>
  );
}
