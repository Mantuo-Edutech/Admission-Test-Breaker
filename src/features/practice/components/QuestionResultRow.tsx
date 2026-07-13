import { Bookmark, Check, Minus, X } from "lucide-react";
import type { PracticeQuestion } from "../content/types.js";
import type { QuestionResult } from "../domain/results.js";
import { MathContent } from "./MathContent.js";

const statusCopy = {
  correct: "正确",
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
}

export function QuestionResultRow({ result, question }: QuestionResultRowProps) {
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
        <span aria-label={`你的答案 ${result.selectedAnswer ?? "未作答"}`}>
          你的答案 <strong>{result.selectedAnswer ?? "—"}</strong>
        </span>
        <span aria-label={`正确答案 ${result.correctAnswer}`}>
          正确答案 <strong>{result.correctAnswer}</strong>
        </span>
        <span>记录用时 <strong>{formatQuestionTime(result.timeMs)}</strong></span>
        {result.marked && <span className="result-row__marked"><Bookmark aria-hidden="true" />曾标记</span>}
      </div>
      <details>
        <summary>查看题干与选项</summary>
        <div className="result-row__question">
          <MathContent blocks={question.prompt} />
          <ol>
            {question.options.map((option) => (
              <li key={option.label} className={option.label === result.correctAnswer ? "is-correct" : ""}>
                <strong>{option.label}</strong>
                <MathContent blocks={option.content} />
              </li>
            ))}
          </ol>
        </div>
      </details>
    </article>
  );
}
