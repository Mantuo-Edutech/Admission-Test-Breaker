import type { PracticePassage, PracticeQuestion } from "../content/types.js";
import { AnswerChoice } from "./AnswerChoice.js";
import { MathContent } from "./MathContent.js";
import { Link } from "react-router-dom";

interface QuestionCardProps {
  question: PracticeQuestion;
  passage?: PracticePassage;
  examName?: string;
  sectionLabel?: string;
  selectedAnswer: string | null;
  feedbackHref?: string;
  onAnswer(answer: string): void;
}

export function QuestionCard({
  question,
  passage,
  examName = "TMUA",
  sectionLabel = "Paper 1",
  selectedAnswer,
  feedbackHref,
  onAnswer,
}: QuestionCardProps) {
  const isDataSet = passage?.content.some((block) => block.kind === "table") === true;
  const isOrdinal = question.responseMode === "ordinal-choice";
  return (
    <article className={`question-card${passage === undefined ? "" : " question-card--with-passage"}`} aria-labelledby={`question-${question.number}`}>
      <div className="question-card__heading">
        <div>
          <p>{examName} · {sectionLabel.toUpperCase()}</p>
          <h1 id={`question-${question.number}`}>第 {question.number} 题</h1>
        </div>
        <span>{isOrdinal ? "情境判断等级题" : passage === undefined ? "单项选择" : isDataSet ? "数据材料选择题" : "文章组选择题"}</span>
      </div>

      <div className="question-card__content">
        {passage !== undefined && (
          <section className="question-card__passage" aria-labelledby={`passage-${passage.id}`}>
            <p>{isOrdinal ? "SCENARIO" : isDataSet ? "DATA SET" : "READING PASSAGE"}</p>
            <h2 id={`passage-${passage.id}`}>{passage.title}</h2>
            <MathContent blocks={passage.content} />
          </section>
        )}
        <div className="question-card__response">
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
