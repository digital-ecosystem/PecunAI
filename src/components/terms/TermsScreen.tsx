import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  confirmed: boolean;
  children: React.ReactNode;
};

export function TermsScreen({ title, subtitle, confirmed, children }: Props) {
  return (
    <div className="flex flex-col h-full p-4 sm:p-6 lg:p-6 ">
      <div className="mb-4 sm:mb-6 flex-shrink-0">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm sm:text-base text-gray-600">{subtitle}</p>
        ) : null}
      </div>

      <div className="bg-gray-50 rounded-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 flex-1 overflow-y-auto border border-gray-200 min-h-0">
        <div className="prose prose-xs sm:prose-sm lg:prose max-w-none text-gray-700 space-y-3 sm:space-y-4">
          {children}
        </div>
      </div>

      {confirmed && (
        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center animate-pulse flex-shrink-0">
          <p className="text-sm sm:text-base">Vielen Dank für die Bestätigung!</p>
        </div>
      )}
    </div>
  );
}
