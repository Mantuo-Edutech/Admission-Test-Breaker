import { BrandMark } from "../../navigation/components/BrandMark.js";
import { ExamTimer } from "./ExamTimer.js";

interface ExamHeaderProps {
  examName: string;
  edition: string;
  sectionLabel: string;
  answeredCount: number;
  totalQuestions: number;
  remainingMs: number;
  mobileMap: React.ReactNode;
  responseMode?: "choice" | "essay";
  onSubmit(): void;
}

export function ExamHeader({
  examName,
  edition,
  sectionLabel,
  answeredCount,
  totalQuestions,
  remainingMs,
  mobileMap,
  responseMode = "choice",
  onSubmit,
}: ExamHeaderProps) {
  const isEssay = responseMode === "essay";
  return (
    <header className="exam-header">
      <div className="exam-header__inner">
        <BrandMark compact />
        <div className="exam-header__paper">
          <strong>{examName} {edition}</strong>
          <span>{sectionLabel} · {isEssay ? "1 writing task" : `${totalQuestions} questions`}</span>
        </div>
        <div className="exam-header__progress" aria-label={isEssay ? `正文${answeredCount > 0 ? "已完成" : "未完成"}` : `已作答 ${answeredCount} / ${totalQuestions}`}>
          <span>{isEssay ? `正文${answeredCount > 0 ? "已完成" : "未完成"}` : `已作答 ${answeredCount} / ${totalQuestions}`}</span>
          <i style={{ "--progress": answeredCount / totalQuestions } as React.CSSProperties} />
        </div>
        <div className="exam-header__actions">
          {mobileMap}
          <ExamTimer remainingMs={remainingMs} />
          <button className="exam-submit-button" type="button" onClick={onSubmit}>
            {isEssay ? "提交写作" : "提交试卷"}
          </button>
        </div>
      </div>
    </header>
  );
}
