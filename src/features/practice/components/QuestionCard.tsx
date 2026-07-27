import type { PracticePassage } from "../content/types.js";
import type { DeliveredPracticeQuestion } from "../delivery/domain.js";
import { AnswerChoice } from "./AnswerChoice.js";
import { MathContent } from "./MathContent.js";
import { Link } from "react-router-dom";

interface QuestionCardProps {
  question: DeliveredPracticeQuestion;
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
  const labelsOnly = question.optionDisplay === "labels-only";
  return (
    <article className={`question-card${passage === undefined ? "" : " question-card--with-passage"}`} aria-labelledby={`question-${question.number}`}>
      <div className="question-card__heading">
        <div>
          <p>{examName} · {sectionLabel.toUpperCase()}</p>
          <h1 id={`question-${question.number}`}>Question {question.number}<small lang="zh-CN">第 {question.number} 题</small></h1>
        </div>
        <span>{isOrdinal ? "Situational judgement" : passage === undefined ? "Single choice" : isDataSet ? "Data set" : "Passage questions"}</span>
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

          <fieldset className={`answer-list${labelsOnly ? " answer-list--labels-only" : ""}`}>
            <legend className="sr-only">Choose an answer for Question {question.number}</legend>
            {question.options.map((option) => (
              <AnswerChoice
                key={option.label}
                option={option}
                questionId={question.id}
                selected={selectedAnswer === option.label}
                labelsOnly={labelsOnly}
                onSelect={onAnswer}
              />
            ))}
          </fieldset>
          {feedbackHref !== undefined && (
            <footer className="question-card__feedback">
              <Link to={feedbackHref}>Report this question <small>报告题目问题</small></Link>
            </footer>
          )}
        </div>
      </div>
    </article>
  );
}
