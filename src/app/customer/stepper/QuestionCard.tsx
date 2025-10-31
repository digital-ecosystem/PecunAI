import React from "react";

type QuestionCardProps = {
  step: number;
  totalSteps: number;
  // title: string;
  // subtitle: string;
  question: string;
  questionText?: string; // To identify specific questions
  questionType?: string; // "choice" or "text"
  options: Array<{ label: string; value: string }> | undefined;
  selected: string | null;
  onSelect: (option: string) => void;
  onNext?: () => void;
  onBack?: () => void;
  questionOrder?: number;
};

const QuestionCard = ({
  step,
  totalSteps,
  // title,
  // subtitle,
  question,
  questionText,
  questionType = "choice", // Default to choice type
  options,
  selected,
  onSelect,
  onNext,
  onBack,
  questionOrder,
}: QuestionCardProps) => {
  console.log("🚀 ~ QuestionCard ~ totalSteps:", totalSteps)
  // Check if this is Question 4 about sustainability and "neutral" is selected
  const isSustainabilityQuestion = 
  (questionText?.includes("sustainability") || questionText?.includes("Nachhaltigkeit")) &&
  (questionText?.includes("considered in your investment advice") || questionText?.includes("berücksichtigen"));

  const isNeutralSelected = isSustainabilityQuestion && selected === "neutral";

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 h-full overflow-y-auto">
      {/* Progress bar */}
      {/* <div className="flex flex-col sm:flex-row sm:justify-between mb-4 sm:mb-6">
        <p className="text-sm sm:text-base text-gray-500 mb-2 sm:mb-0">Question {step} of {totalSteps}</p>
        <p className="text-sm sm:text-base text-gray-500">{Math.round((step / totalSteps) * 100)}%</p>
      </div> */}
      {/* <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-6 sm:mb-8">
        <div
          className="bg-blue-600 h-2 sm:h-3 rounded-full transition-all duration-300"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        ></div>
      </div> */}

      {/* Icon + Titles */}
      {/* <div className="flex flex-col items-center mb-6 sm:mb-8">
        <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 text-lg sm:text-xl font-bold">
          ?
        </div> */}
        {/* <h2 className="text-xl font-bold mt-4">{title}</h2>
        <p className="text-gray-500 text-sm">{subtitle}</p> */}
      {/* </div> */}

      {/* Question */}
      <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-4 sm:mb-6 text-center sm:text-left leading-relaxed">{questionOrder}. {question}</h3>

      {/* Render based on question type */}
      {questionType === "text" ? (
        /* Text Input */
        <div className="mb-6 sm:mb-8">
          <input
            type="text"
            value={selected || ""}
            onChange={(e) => onSelect(e.target.value)}
            placeholder="Please enter your answer..."
            className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm sm:text-base"
          />
        </div>
      ) : (
        /* Multiple Choice Options */
        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          {options?.map((opt, idx) => (
            <label
              key={idx}
              className={`flex items-start sm:items-center gap-3 p-3 sm:p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md
                ${selected === opt.value
                  ? isNeutralSelected 
                    ? "border-yellow-500 bg-yellow-50 shadow-sm" 
                    : "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                }`}
            >
              <input
                type="radio"
                name="answer"
                value={opt.value}
                checked={selected === opt.value}
                onChange={() => onSelect(opt.value)}
                className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5 sm:mt-0 flex-shrink-0"
              />
              <span className="text-sm sm:text-base text-gray-700 leading-relaxed">{opt.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Special message for neutral sustainability selection */}
      {isNeutralSelected && (
        <div className="mb-2 sm:mb-2 p-2 sm:p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 mt-0.5 flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-semibold text-yellow-800 mb-2">
                Sustainability Consideration
              </h4>
              <p className="text-xs sm:text-sm text-yellow-700 leading-relaxed">
                You have selected to remain neutral regarding sustainability in your investment advice. 
                Please note that our investment recommendations will not specifically consider environmental, 
                social, or governance (ESG) factors in the selection process.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
        {onBack && (
          <button
            onClick={onBack}
            disabled={step === 1}
            className="order-2 sm:order-1 px-4 sm:px-6 py-2 sm:py-3 rounded-lg border text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors text-sm sm:text-base font-medium"
          >
            Back
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            disabled={!selected || (questionType === "text" && selected?.trim() === "")}
            className="order-1 sm:order-2 px-6 sm:px-8 py-2 sm:py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors text-sm sm:text-base"
          >
            <span className="hidden sm:inline">Next →</span>
            <span className="sm:hidden">Continue</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionCard;
