import type { PracticeOption } from "../content/types.js";
import { MathContent } from "./MathContent.js";

interface AnswerChoiceProps {
  option: PracticeOption;
  questionId: string;
  selected: boolean;
  onSelect(label: string): void;
}

export function AnswerChoice({
  option,
  questionId,
  selected,
  onSelect,
}: AnswerChoiceProps) {
  return (
    <label className={`answer-choice${selected ? " answer-choice--selected" : ""}`}>
      <input
        type="radio"
        name={`answer-${questionId}`}
        value={option.label}
        checked={selected}
        aria-label={`选项 ${option.label}`}
        onChange={() => onSelect(option.label)}
      />
      <span className="sr-only">选项 {option.label}</span>
      <span className="answer-choice__letter" aria-hidden="true">
        {option.label}
      </span>
      <div className="answer-choice__content">
        <MathContent blocks={option.content} />
      </div>
    </label>
  );
}
