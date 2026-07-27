import type { PracticeOption } from "../content/types.js";
import { MathContent } from "./MathContent.js";

interface AnswerChoiceProps {
  option: PracticeOption;
  questionId: string;
  selected: boolean;
  labelsOnly?: boolean;
  onSelect(label: string): void;
}

export function AnswerChoice({
  option,
  questionId,
  selected,
  labelsOnly = false,
  onSelect,
}: AnswerChoiceProps) {
  return (
    <label className={`answer-choice${selected ? " answer-choice--selected" : ""}${labelsOnly ? " answer-choice--label-only" : ""}`}>
      <input
        type="radio"
        name={`answer-${questionId}`}
        value={option.label}
        checked={selected}
        aria-label={`Option ${option.label}`}
        onChange={() => onSelect(option.label)}
      />
      <span className="sr-only">Option {option.label}</span>
      <span className="answer-choice__letter" aria-hidden="true">
        {option.label}
      </span>
      {labelsOnly ? null : (
        <div className="answer-choice__content">
          <MathContent blocks={option.content} />
        </div>
      )}
    </label>
  );
}
