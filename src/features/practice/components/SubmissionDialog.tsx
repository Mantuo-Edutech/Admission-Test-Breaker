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
              <Dialog.Title>{isEssay ? "准备提交这篇写作？" : "准备提交这份试卷？"}</Dialog.Title>
            </div>
            <Dialog.Close className="icon-button" aria-label="关闭提交确认">
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="submission-dialog__description">
            {isEssay
              ? "提交后会显示所选题目、字数、用时和完整正文，内容将不能再修改。"
              : "提交后会显示答案与本次练习结果，作答将不能再修改。"}
          </Dialog.Description>
          {isEssay ? (
            <div className="submission-counts">
              <span className={answeredCount === 0 ? "has-warning" : ""}>
                <strong>{answeredCount > 0 ? "已完成" : "未完成"}</strong> 正文状态
              </span>
            </div>
          ) : (
            <div className="submission-counts">
              <span><strong>{answeredCount}</strong> 已作答</span>
              <span className={unansweredCount > 0 ? "has-warning" : ""}>
                <strong>{unansweredCount}</strong> 未作答
              </span>
              <span><strong>{markedCount}</strong> 已标记</span>
            </div>
          )}
          {unansweredCount > 0 && (
            <p className="submission-warning">
              <AlertCircle aria-hidden="true" />
              {isEssay ? "正文还没有完成；你仍然可以提交本次记录。" : `未作答 ${unansweredCount} 题；你仍然可以提交。`}
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
              返回检查
            </Dialog.Close>
            <button
              className="button button--primary"
              type="button"
              disabled={submitting}
              onClick={onConfirm}
            >
              {submitting ? "正在提交…" : submitError === null ? "确认提交" : "重新保存并提交"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
