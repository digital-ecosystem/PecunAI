import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  iconBgClass: string;
  iconColorClass: string;
}

export default function KPICard({
  label,
  value,
  icon: Icon,
  iconBgClass,
  iconColorClass,
}: KPICardProps) {
  return (
    <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
      <div className="flex items-center">
        <div
          className={`w-8 h-8 sm:w-10 sm:h-10 ${iconBgClass} rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0`}
        >
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColorClass}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-gray-600 truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
