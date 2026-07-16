import * as Dialog from "@radix-ui/react-dialog";
import { Grid2X2, X } from "lucide-react";
import type { PracticeSession } from "../domain/session.js";
import { questionIdForNumber, TMUA_2023_P1_QUESTION_COUNT } from "../domain/session.js";

interface QuestionMapProps {
  session: PracticeSession;
  onSelect(questionNumber: number): void;
}

function questionState(session: PracticeSession, questionNumber: number) {
  const questionId = questionIdForNumber(questionNumber, session.paperId);
  return {
    current: session.currentQuestion === questionNumber,
    answered: session.answers[questionId] !== undefined,
    marked: session.markedQuestionIds.includes(questionId),
  };
}

export function QuestionMap({ session, onSelect }: QuestionMapProps) {
  return (
    <nav className="question-map" aria-label="题目导航">
      {Array.from(
        { length: TMUA_2023_P1_QUESTION_COUNT },
        (_, index) => index + 1,
      ).map((questionNumber) => {
        const state = questionState(session, questionNumber);
        const stateLabel = [
          state.current ? "当前" : null,
          state.answered ? "已作答" : "未作答",
          state.marked ? "已标记" : null,
        ]
          .filter(Boolean)
          .join("，");
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
            aria-label={`第 ${questionNumber} 题，${stateLabel}`}
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

export function MobileQuestionMap({ session, onSelect }: QuestionMapProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="exam-map-trigger" type="button">
          <Grid2X2 aria-hidden="true" />
          题目
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content question-map-dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title>题目导航</Dialog.Title>
              <Dialog.Description>
                紫色为已作答，角标代表已标记。
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="关闭题目导航">
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Close asChild>
            <div>
              <QuestionMap session={session} onSelect={onSelect} />
            </div>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
