import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value?: string | number;
  splitValues?: { label: string; value: string }[];
  icon: LucideIcon;
  iconBgClass: string;
  iconColorClass: string;
  /**
   * `hero` renders the centred focal card that sits in the middle of the KPI
   * row (icon over a large number over the label). Presentation only.
   */
  variant?: 'default' | 'hero';
  className?: string;
}

export default function KPICard({
  label,
  value,
  splitValues,
  icon: Icon,
  iconBgClass,
  iconColorClass,
  variant = 'default',
  className,
}: KPICardProps) {
  if (variant === 'hero') {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface-card p-4 text-center shadow-soft transition-shadow hover:shadow-raised ${className ?? ''}`}
      >
        <div
          className={`mb-1 flex h-[34px] w-[34px] items-center justify-center rounded-xl ${iconBgClass} ${iconColorClass}`}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div className="text-[28px] font-semibold leading-none tabular-nums text-text-primary">
          {value}
        </div>
        {label ? <div className="mt-1 text-[11px] text-text-muted">{label}</div> : null}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-1 items-start gap-3 rounded-[14px] bg-surface-card p-4 shadow-soft transition-shadow hover:shadow-raised ${className ?? ''}`}
    >
      <div
        className={`flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-xl ${iconBgClass} ${iconColorClass}`}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        {label ? <p className="mb-1 truncate text-[11px] text-text-muted">{label}</p> : null}
        {splitValues ? (
          <div className="space-y-0.5">
            {splitValues.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] text-text-muted">{row.label}</span>
                <span className="truncate text-xs font-semibold tabular-nums text-text-primary">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xl font-semibold leading-none tabular-nums text-text-primary">{value}</p>
        )}
      </div>
    </div>
  );
}
