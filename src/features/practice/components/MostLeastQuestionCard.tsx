import { Link } from "react-router-dom";
import type { PracticePassage, PracticeQuestion } from "../content/types.js";
import { parseMostLeastAnswer, serializeMostLeastAnswer } from "../domain/most-least-response.js";
import { MathContent } from "./MathContent.js";

interface MostLeastQuestionCardProps {
  question: PracticeQuestion;
  passage?: PracticePassage;
  examName: string;
  sectionLabel: string;
  selectedAnswer: string | null;
  feedbackHref?: string;
  onAnswer(answer: string): void;
}

export function MostLeastQuestionCard({
  question,
  passage,
  examName,
  sectionLabel,
  selectedAnswer,
  feedbackHref,
  onAnswer,
}: MostLeastQuestionCardProps) {
  const answer = parseMostLeastAnswer(selectedAnswer ?? undefined);

  function choose(kind: "most" | "least", label: string) {
    const other = kind === "most" ? "least" : "most";
    onAnswer(serializeMostLeastAnswer({
      ...answer,
      [kind]: label,
      ...(answer[other] === label ? { [other]: undefined } : {}),
    }));
  }

  return (
    <article className="question-card question-card--with-passage most-least-card" aria-labelledby={`question-${question.number}`}>
      <div className="question-card__heading">
        <div>
          <p>{examName} · {sectionLabel.toUpperCase()}</p>
          <h1 id={`question-${question.number}`}>第 {question.number} 题</h1>
        </div>
        <span>最合适 / 最不合适</span>
      </div>
      <div className="question-card__content">
        {passage !== undefined && (
          <section className="question-card__passage" aria-labelledby={`passage-${passage.id}`}>
            <p>SCENARIO</p>
            <h2 id={`passage-${passage.id}`}>{passage.title}</h2>
            <MathContent blocks={passage.content} />
          </section>
        )}
        <div className="question-card__response">
          <div className="question-card__prompt"><MathContent blocks={question.prompt} /></div>
          <div className="most-least-response" role="group" aria-label="选择最合适和最不合适的行动">
            <div className="most-least-response__heading" aria-hidden="true">
              <span>行动</span><span>最合适</span><span>最不合适</span>
            </div>
            {question.options.map((option) => (
              <div className="most-least-response__row" key={option.label}>
                <div><strong>{option.label}</strong><MathContent blocks={option.content} /></div>
                {(["most", "least"] as const).map((kind) => (
                  <label key={kind}>
                    <input
                      type="radio"
                      name={`${question.id}-${kind}`}
                      value={option.label}
                      checked={answer[kind] === option.label}
                      onChange={() => choose(kind, option.label)}
                    />
                    <span>{kind === "most" ? "最合适" : "最不合适"}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          {feedbackHref !== undefined && (
            <footer className="question-card__feedback">
              <Link to={feedbackHref}>报告这道题的问题 · Report this question</Link>
            </footer>
          )}
        </div>
      </div>
    </article>
  );
}
