import React from "react";

type QuestionCardProps = {
  step: number;
  totalSteps: number;
  // title: string;
  // subtitle: string;
  question: string;
  questionText?: string; // To identify specific questions
  options: Array<{ label: string; value: string }> | undefined;
  selected: string | null;
  onSelect: (option: string) => void;
  onNext?: () => void;
  onBack?: () => void;
};

const QuestionCard = ({
  step,
  totalSteps,
  // title,
  // subtitle,
  question,
  questionText,
  options,
  selected,
  onSelect,
  onNext,
  onBack,
}: QuestionCardProps) => {
  // Check if this is Question 4 about sustainability and "neutral" is selected
  const isSustainabilityQuestion = questionText?.includes("sustainability") && questionText?.includes("considered in your investment advice");
  const isNeutralSelected = isSustainabilityQuestion && selected === "neutral";

  return (
    <div className="max-w-2xl w-2xl mx-auto p-6 bg-white rounded-2xl shadow">
      {/* Progress bar */}
      <div className="flex justify-between mb-4">
        <p className="text-sm text-gray-500">Question {step} of {totalSteps}</p>
        <p className="text-sm text-gray-500">{Math.round((step / totalSteps) * 100)}%</p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-blue-600 h-2 rounded-full"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        ></div>
      </div>

      {/* Icon + Titles */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 text-xl font-bold">
          ?
        </div>
        {/* <h2 className="text-xl font-bold mt-4">{title}</h2>
        <p className="text-gray-500 text-sm">{subtitle}</p> */}
      </div>

      {/* Question */}
      <h3 className="text-lg font-semibold mb-4">{question}</h3>

      {/* Options */}
      <div className="space-y-3">
        {options?.map((opt, idx) => (
          <label
            key={idx}
            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition
              ${selected === opt.value
                ? isNeutralSelected 
                  ? "border-yellow-500 bg-yellow-50" 
                  : "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:bg-gray-50"
              }`}
          >
            <input
              type="radio"
              name="answer"
              value={opt.value}
              checked={selected === opt.value}
              onChange={() => onSelect(opt.value)}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-gray-700">{opt.label}</span>
          </label>
        ))}
      </div>

      {/* Special message for neutral sustainability selection */}
      {isNeutralSelected && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 mt-0.5 flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                Sustainability Consideration
              </h4>
              <p className="text-sm text-yellow-700">
                You have selected to remain neutral regarding sustainability in your investment advice. 
                Please note that our investment recommendations will not specifically consider environmental, 
                social, or governance (ESG) factors in the selection process.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
      {onBack && (
        <button
          onClick={onBack}
          disabled={step === 1}
          className="px-4 py-2 rounded-lg border text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
        >
          Back
        </button>
      )}
      {onNext && (
        <button
          onClick={onNext}
          disabled={!selected}
          className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40"
        >
          Next →
        </button>
      )}
      </div>
    </div>
  );
};

export default QuestionCard;
