import type { PracticeQuestion } from "../content/types.js";
import { AnswerChoice } from "./AnswerChoice.js";
import { MathContent } from "./MathContent.js";

interface QuestionCardProps {
  question: PracticeQuestion;
  selectedAnswer: string | null;
  onAnswer(answer: string): void;
}

export function QuestionCard({
  question,
  selectedAnswer,
  onAnswer,
}: QuestionCardProps) {
  return (
    <article className="question-card" aria-labelledby={`question-${question.number}`}>
      <div className="question-card__heading">
        <div>
          <p>TMUA · PAPER 1</p>
          <h1 id={`question-${question.number}`}>第 {question.number} 题</h1>
        </div>
        <span>单项选择</span>
      </div>

      <div className="question-card__prompt">
        <MathContent blocks={question.prompt} />
      </div>

      <fieldset className="answer-list">
        <legend className="sr-only">请选择第 {question.number} 题的答案</legend>
        {question.options.map((option) => (
          <AnswerChoice
            key={option.label}
            option={option}
            questionId={question.id}
            selected={selectedAnswer === option.label}
            onSelect={onAnswer}
          />
        ))}
      </fieldset>
    </article>
  );
}
