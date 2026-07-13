import { Clock3 } from "lucide-react";
import { formatRemainingTime } from "../domain/timer.js";

export function ExamTimer({ remainingMs }: { remainingMs: number }) {
  const urgent = remainingMs <= 5 * 60_000;
  return (
    <div
      className={`exam-timer${urgent ? " exam-timer--urgent" : ""}`}
      aria-label={`剩余时间 ${formatRemainingTime(remainingMs)}`}
    >
      <Clock3 aria-hidden="true" />
      <span>{formatRemainingTime(remainingMs)}</span>
    </div>
  );
}
