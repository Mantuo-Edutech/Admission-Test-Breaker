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
        <div className="exam-header__progress" aria-label={isEssay ? `Response ${answeredCount > 0 ? "complete" : "incomplete"}` : `${answeredCount} of ${totalQuestions} answered`}>
          <span>{isEssay ? `Response ${answeredCount > 0 ? "complete" : "incomplete"}` : `${answeredCount} / ${totalQuestions} answered`}</span>
          <i style={{ "--progress": answeredCount / totalQuestions } as React.CSSProperties} />
        </div>
        <div className="exam-header__actions">
          {mobileMap}
          <ExamTimer remainingMs={remainingMs} />
          <button className="exam-submit-button" type="button" onClick={onSubmit}>
            {isEssay ? "Submit writing" : "Submit paper"}
          </button>
        </div>
      </div>
    </header>
  );
}
