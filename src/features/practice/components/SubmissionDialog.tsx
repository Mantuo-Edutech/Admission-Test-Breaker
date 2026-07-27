import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, X } from "lucide-react";

interface SubmissionDialogProps {
  open: boolean;
  answeredCount: number;
  markedCount: number;
  totalQuestions: number;
  submitting: boolean;
  submitError?: string | null;
  responseMode?: "choice" | "essay";
  onOpenChange(open: boolean): void;
  onConfirm(): void;
}

export function SubmissionDialog({
  open,
  answeredCount,
  markedCount,
  totalQuestions,
  submitting,
  submitError = null,
  responseMode = "choice",
  onOpenChange,
  onConfirm,
}: SubmissionDialogProps) {
  const unansweredCount = totalQuestions - answeredCount;
  const isEssay = responseMode === "essay";
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content submission-dialog">
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">FINAL CHECK</p>
              <Dialog.Title>{isEssay ? "Submit this response?" : "Submit this paper?"}</Dialog.Title>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close submission check">
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="submission-dialog__description">
            {isEssay
              ? "After submission, you can review your chosen prompt, word count, active time and full response. You cannot edit it afterwards."
              : "After submission, you can review your answers and results. You cannot edit them afterwards."}
          </Dialog.Description>
          {isEssay ? (
            <div className="submission-counts">
              <span className={answeredCount === 0 ? "has-warning" : ""}>
                <strong>{answeredCount > 0 ? "Complete" : "Incomplete"}</strong> response
              </span>
            </div>
          ) : (
            <div className="submission-counts">
              <span><strong>{answeredCount}</strong> answered</span>
              <span className={unansweredCount > 0 ? "has-warning" : ""}>
                <strong>{unansweredCount}</strong> unanswered
              </span>
              <span><strong>{markedCount}</strong> marked</span>
            </div>
          )}
          {unansweredCount > 0 && (
            <p className="submission-warning">
              <AlertCircle aria-hidden="true" />
              {isEssay ? "Your response is incomplete, but you can still submit this attempt." : `${unansweredCount} questions are unanswered. You can still submit.`}
            </p>
          )}
          {submitError !== null && (
            <p className="submission-error" role="alert">
              <AlertCircle aria-hidden="true" />
              {submitError}
            </p>
          )}
          <div className="dialog-actions">
            <Dialog.Close className="button button--secondary" type="button">
              Review answers
            </Dialog.Close>
            <button
              className="button button--primary"
              type="button"
              disabled={submitting}
              onClick={onConfirm}
            >
              {submitting ? "Submitting…" : submitError === null ? "Submit" : "Save and submit again"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
