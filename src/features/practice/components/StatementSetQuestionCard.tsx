import { Link } from "react-router-dom";
import type { PracticePassage } from "../content/types.js";
import type { DeliveredPracticeQuestion } from "../delivery/domain.js";
import {
  parseStatementAnswers,
  serializeStatementAnswers,
  type StatementAnswer,
} from "../domain/statement-response.js";
import { MathContent } from "./MathContent.js";

interface StatementSetQuestionCardProps {
  question: DeliveredPracticeQuestion;
  passage?: PracticePassage;
  examName: string;
  sectionLabel: string;
  selectedAnswer: string | null;
  feedbackHref?: string;
  onAnswer(answer: string): void;
}

export function StatementSetQuestionCard({
  question,
  passage,
  examName,
  sectionLabel,
  selectedAnswer,
  feedbackHref,
  onAnswer,
}: StatementSetQuestionCardProps) {
  const answers = parseStatementAnswers(selectedAnswer ?? undefined);

  function answerStatement(statementId: string, answer: StatementAnswer) {
    onAnswer(serializeStatementAnswers({ ...answers, [statementId]: answer }));
  }

  return (
    <article className={`question-card statement-set-card${passage === undefined ? "" : " question-card--with-passage"}`} aria-labelledby={`question-${question.number}`}>
      <div className="question-card__heading">
        <div>
          <p>{examName} · {sectionLabel.toUpperCase()}</p>
          <h1 id={`question-${question.number}`}>第 {question.number} 题</h1>
        </div>
        <span>多陈述判断题</span>
      </div>

      <div className="question-card__content">
        {passage !== undefined && (
          <section className="question-card__passage" aria-labelledby={`passage-${passage.id}`}>
            <p>INFORMATION SET</p>
            <h2 id={`passage-${passage.id}`}>{passage.title}</h2>
            <MathContent blocks={passage.content} />
          </section>
        )}
        <div className="question-card__response">
          <div className="question-card__prompt"><MathContent blocks={question.prompt} /></div>
          <div className="statement-response-list">
            {(question.statements ?? []).map((statement, index) => (
              <fieldset key={statement.id}>
                <legend><span>{index + 1}</span><MathContent blocks={statement.content} /></legend>
                <div>
                  {(["yes", "no"] as const).map((answer) => (
                    <label key={answer}>
                      <input
                        type="radio"
                        name={`${question.id}-${statement.id}`}
                        value={answer}
                        checked={answers[statement.id] === answer}
                        onChange={() => answerStatement(statement.id, answer)}
                      />
                      <span>{answer === "yes" ? "Yes" : "No"}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
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
