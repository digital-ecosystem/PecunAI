import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value?: string | number;
  splitValues?: { label: string; value: string }[];
  icon: LucideIcon;
  iconBgClass: string;
  iconColorClass: string;
}

export default function KPICard({
  label,
  value,
  splitValues,
  icon: Icon,
  iconBgClass,
  iconColorClass,
}: KPICardProps) {
  return (
    <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
      <div className="flex items-start">
        <div
          className={`w-8 h-8 sm:w-10 sm:h-10 ${iconBgClass} rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0 mt-0.5`}
        >
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColorClass}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-gray-600 truncate">{label}</p>
          {splitValues ? (
            <div className="mt-1 space-y-1">
              {splitValues.map((row) => {
                const slashIdx = row.value.indexOf('/');
                const main = slashIdx !== -1 ? row.value.slice(0, slashIdx) : row.value;
                const suffix = slashIdx !== -1 ? row.value.slice(slashIdx) : null;
                return (
                  <div key={row.label} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-gray-500 shrink-0 mt-1">{row.label}</span>
                    <div className="text-right">
                      <p className="text-base font-bold text-gray-900 tabular-nums leading-tight">{main}</p>
                      {suffix && <p className="text-xs text-gray-400 tabular-nums">{suffix}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}
