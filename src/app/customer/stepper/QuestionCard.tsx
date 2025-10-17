import React from "react";

type QuestionCardProps = {
  step: number;
  totalSteps: number;
  // title: string;
  // subtitle: string;
  question: string;
  options: Array<{ label: string; value: string }> | undefined;
  selected: string | null;
  onSelect: (option: string) => void;
  onNext: () => void;
  onBack: () => void;
};

const QuestionCard = ({
  step,
  totalSteps,
  // title,
  // subtitle,
  question,
  options,
  selected,
  onSelect,
  onNext,
  onBack,
}: QuestionCardProps) => {
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
                ? "border-blue-500 bg-blue-50"
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

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          disabled={step === 1}
          className="px-4 py-2 rounded-lg border text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!selected}
          className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default QuestionCard;
