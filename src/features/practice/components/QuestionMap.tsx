import * as Dialog from "@radix-ui/react-dialog";
import { Grid2X2, X } from "lucide-react";
import type { PracticeSession } from "../domain/session.js";
import { questionIdForNumber } from "../domain/session.js";

interface QuestionMapProps {
  session: PracticeSession;
  totalQuestions: number;
  answeredQuestionIds?: ReadonlySet<string>;
  onSelect(questionNumber: number): void;
}

function questionState(session: PracticeSession, questionNumber: number, answeredQuestionIds?: ReadonlySet<string>) {
  const questionId = questionIdForNumber(questionNumber, session.paperId);
  return {
    current: session.currentQuestion === questionNumber,
    answered: answeredQuestionIds?.has(questionId) ?? session.answers[questionId] !== undefined,
    marked: session.markedQuestionIds.includes(questionId),
  };
}

export function QuestionMap({ session, totalQuestions, answeredQuestionIds, onSelect }: QuestionMapProps) {
  return (
    <nav className="question-map" aria-label="Question navigation">
      {Array.from(
        { length: totalQuestions },
        (_, index) => index + 1,
      ).map((questionNumber) => {
        const state = questionState(session, questionNumber, answeredQuestionIds);
        const stateLabel = [
          state.current ? "current" : null,
          state.answered ? "answered" : "unanswered",
          state.marked ? "marked" : null,
        ]
          .filter(Boolean)
          .join(", ");
        return (
          <button
            key={questionNumber}
            type="button"
            className={[
              "question-map__item",
              state.current ? "is-current" : "",
              state.answered ? "is-answered" : "",
              state.marked ? "is-marked" : "",
            ].filter(Boolean).join(" ")}
            aria-current={state.current ? "step" : undefined}
            aria-label={`Question ${questionNumber}, ${stateLabel}`}
            onClick={() => onSelect(questionNumber)}
          >
            {questionNumber}
            {state.marked && <span aria-hidden="true" />}
          </button>
        );
      })}
    </nav>
  );
}

export function MobileQuestionMap({ session, totalQuestions, answeredQuestionIds, onSelect }: QuestionMapProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="exam-map-trigger" type="button">
          <Grid2X2 aria-hidden="true" />
          Questions
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content question-map-dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title>Question navigation</Dialog.Title>
              <Dialog.Description>
                Purple means answered. A corner marker means flagged.
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close question navigation">
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Close asChild>
            <div>
              <QuestionMap session={session} totalQuestions={totalQuestions} answeredQuestionIds={answeredQuestionIds} onSelect={onSelect} />
            </div>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
