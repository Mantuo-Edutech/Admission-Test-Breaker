import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, X } from "lucide-react";

interface SubmissionDialogProps {
  open: boolean;
  answeredCount: number;
  markedCount: number;
  totalQuestions: number;
  submitting: boolean;
  onOpenChange(open: boolean): void;
  onConfirm(): void;
}

export function SubmissionDialog({
  open,
  answeredCount,
  markedCount,
  totalQuestions,
  submitting,
  onOpenChange,
  onConfirm,
}: SubmissionDialogProps) {
  const unansweredCount = totalQuestions - answeredCount;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content submission-dialog">
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">FINAL CHECK</p>
              <Dialog.Title>准备提交这份试卷？</Dialog.Title>
            </div>
            <Dialog.Close className="icon-button" aria-label="关闭提交确认">
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="submission-dialog__description">
            提交后会显示答案与本次练习结果，作答将不能再修改。
          </Dialog.Description>
          <div className="submission-counts">
            <span><strong>{answeredCount}</strong> 已作答</span>
            <span className={unansweredCount > 0 ? "has-warning" : ""}>
              <strong>{unansweredCount}</strong> 未作答
            </span>
            <span><strong>{markedCount}</strong> 已标记</span>
          </div>
          {unansweredCount > 0 && (
            <p className="submission-warning">
              <AlertCircle aria-hidden="true" />
              未作答 {unansweredCount} 题；你仍然可以提交。
            </p>
          )}
          <div className="dialog-actions">
            <Dialog.Close className="button button--secondary" type="button">
              返回检查
            </Dialog.Close>
            <button
              className="button button--primary"
              type="button"
              disabled={submitting}
              onClick={onConfirm}
            >
              {submitting ? "正在提交…" : "确认提交"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
