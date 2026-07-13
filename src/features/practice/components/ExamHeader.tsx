import { BrandMark } from "./BrandMark.js";
import { ExamTimer } from "./ExamTimer.js";

interface ExamHeaderProps {
  answeredCount: number;
  totalQuestions: number;
  remainingMs: number;
  mobileMap: React.ReactNode;
  onSubmit(): void;
}

export function ExamHeader({
  answeredCount,
  totalQuestions,
  remainingMs,
  mobileMap,
  onSubmit,
}: ExamHeaderProps) {
  return (
    <header className="exam-header">
      <div className="exam-header__inner">
        <BrandMark compact />
        <div className="exam-header__paper">
          <strong>TMUA 2023</strong>
          <span>Paper 1 · 20 questions</span>
        </div>
        <div className="exam-header__progress" aria-label={`已作答 ${answeredCount} / ${totalQuestions}`}>
          <span>已作答 {answeredCount} / {totalQuestions}</span>
          <i style={{ "--progress": answeredCount / totalQuestions } as React.CSSProperties} />
        </div>
        <div className="exam-header__actions">
          {mobileMap}
          <ExamTimer remainingMs={remainingMs} />
          <button className="exam-submit-button" type="button" onClick={onSubmit}>
            提交试卷
          </button>
        </div>
      </div>
    </header>
  );
}
