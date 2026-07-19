import { Bookmark, Check, Minus, X } from "lucide-react";
import type { PracticeQuestion } from "../content/types.js";
import type { QuestionResult } from "../domain/results.js";
import type { WorkedExplanation } from "../../entitled-content/domain.js";
import { MathContent } from "./MathContent.js";
import { Link } from "react-router-dom";
import { parseStatementAnswers } from "../domain/statement-response.js";
import { parseMostLeastAnswer } from "../domain/most-least-response.js";

const statusCopy = {
  correct: "正确",
  partial: "部分得分",
  incorrect: "错误",
  unanswered: "未作答",
} as const;

function StatusIcon({ status }: { status: QuestionResult["status"] }) {
  if (status === "correct") return <Check aria-hidden="true" />;
  if (status === "incorrect") return <X aria-hidden="true" />;
  return <Minus aria-hidden="true" />;
}

function formatQuestionTime(timeMs: number): string {
  const seconds = Math.round(timeMs / 1_000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}分 ${remainder}秒` : `${remainder}秒`;
}

interface QuestionResultRowProps {
  result: QuestionResult;
  question: PracticeQuestion;
  explanation?: WorkedExplanation;
  feedbackHref?: string;
}

export function QuestionResultRow({ result, question, explanation, feedbackHref }: QuestionResultRowProps) {
  const statementAnswers = question.responseMode === "statement-set"
    ? parseStatementAnswers(result.selectedAnswer ?? undefined)
    : null;
  const mostLeastAnswer = question.responseMode === "most-least-choice"
    ? parseMostLeastAnswer(result.selectedAnswer ?? undefined)
    : null;
  const mostLeastKey = question.responseMode === "most-least-choice"
    ? parseMostLeastAnswer(question.correctAnswer)
    : null;
  return (
    <article className={`result-row result-row--${result.status}`}>
      <div className="result-row__status">
        <span><StatusIcon status={result.status} /></span>
        <div>
          <small>QUESTION {String(result.number).padStart(2, "0")}</small>
          <h3>第 {result.number} 题 · {statusCopy[result.status]}</h3>
        </div>
      </div>
      <div className="result-row__answers">
        {mostLeastAnswer !== null && mostLeastKey !== null ? (
          <>
            <span>你的选择 <strong>最合适 {mostLeastAnswer.most ?? "—"} · 最不合适 {mostLeastAnswer.least ?? "—"}</strong></span>
            <span>参考答案 <strong>最合适 {mostLeastKey.most} · 最不合适 {mostLeastKey.least}</strong></span>
          </>
        ) : statementAnswers === null ? (
          <>
            <span aria-label={`你的答案 ${result.selectedAnswer ?? "未作答"}`}>
              你的答案 <strong>{result.selectedAnswer ?? "—"}</strong>
            </span>
            <span aria-label={`正确答案 ${result.correctAnswer}`}>
              正确答案 <strong>{result.correctAnswer}</strong>
            </span>
          </>
        ) : (
          <>
            <span>陈述完成 <strong>{Object.keys(statementAnswers).length} / {question.statements?.length ?? 0}</strong></span>
            <span>本题得分 <strong>{result.points} / {result.maxPoints}</strong></span>
          </>
        )}
        <span>记录用时 <strong>{formatQuestionTime(result.timeMs)}</strong></span>
        {result.marked && <span className="result-row__marked"><Bookmark aria-hidden="true" />曾标记</span>}
      </div>
      <details>
        <summary>查看题干与选项</summary>
        <div className="result-row__question">
          <MathContent blocks={question.prompt} />
          {statementAnswers === null ? (
            <ol>
              {question.options.map((option) => (
                <li key={option.label} className={option.label === result.correctAnswer || option.label === mostLeastKey?.most || option.label === mostLeastKey?.least ? "is-correct" : ""}>
                  <strong>{option.label}</strong>
                  <MathContent blocks={option.content} />
                  {mostLeastKey?.most === option.label && <span>参考：最合适</span>}
                  {mostLeastKey?.least === option.label && <span>参考：最不合适</span>}
                </li>
              ))}
            </ol>
          ) : (
            <ol className="statement-result-list">
              {(question.statements ?? []).map((statement) => (
                <li key={statement.id} className={statementAnswers[statement.id] === statement.correctAnswer ? "is-correct" : ""}>
                  <MathContent blocks={statement.content} />
                  <span>你的答案 <strong>{statementAnswers[statement.id] === "yes" ? "Yes" : statementAnswers[statement.id] === "no" ? "No" : "—"}</strong></span>
                  <span>正确答案 <strong>{statement.correctAnswer === "yes" ? "Yes" : "No"}</strong></span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </details>
      {explanation !== undefined && (
        <section className="worked-explanation" aria-label={`第 ${result.number} 题深度解析`}>
          <header>
            <div>
              <small>{explanation.topicEn}</small>
              <h4>{explanation.topicZh}</h4>
            </div>
            <p><strong>{explanation.methodZh}</strong><span>{explanation.methodEn}</span></p>
          </header>
          <p className="worked-explanation__idea">{explanation.keyIdeaZh}</p>
          <ol>
            {explanation.steps.map((step, index) => (
              <li key={`${explanation.questionId}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{step.titleZh}</strong>
                  <p>{step.bodyZh}</p>
                  {step.math !== undefined && (
                    <MathContent blocks={[{ kind: "display-math", tex: step.math }]} />
                  )}
                </div>
              </li>
            ))}
          </ol>
          <p className="worked-explanation__conclusion">{explanation.conclusionZh}</p>
          <div className="worked-explanation__actions">
            <p><strong>容易错在哪里</strong>{explanation.trapZh}</p>
            <p><strong>下一步训练</strong>{explanation.nextDrillZh}</p>
          </div>
        </section>
      )}
      {feedbackHref !== undefined && (
        <footer className="result-row__feedback">
          <Link to={feedbackHref}>报告这道题的问题 · Report this question</Link>
        </footer>
      )}
    </article>
  );
}
