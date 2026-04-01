"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface SustainabilityStopPopupProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  message?: string;
  subMessage?: string;
  infoText?: string;
}

export const SustainabilityStopPopup: React.FC<SustainabilityStopPopupProps> = ({
  isOpen,
  onClose,
  title = "Antrag gestoppt",
  message = "Ihr Antrag kann nicht digital abgeschlossen werden.",
  subMessage = "Aus regulatorischen Gründen ist eine persönliche Betreuung notwendig.",
  infoText = "Ihr Berater wird sich zeitnah bei Ihnen melden, um den Prozess manuell fortzuführen.",
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleBackToDashboard = () => {
    if (onClose) onClose();
    router.push("/customer/dashboard");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
        {/* Warning Icon */}
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>

        {/* Messages */}
        <div className="space-y-4 text-gray-600">
          <p className="font-medium text-lg">{message}</p>
          <p>{subMessage}</p>
          <p className="text-sm bg-gray-50 p-4 rounded-lg border border-gray-100">
            {infoText}
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-8">
          <button
            onClick={handleBackToDashboard}
            className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default SustainabilityStopPopup;

