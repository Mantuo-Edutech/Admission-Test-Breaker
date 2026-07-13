export function remainingTimeMs(
  deadlineAt: string,
  now: string | number | Date,
): number {
  const deadlineMs = Date.parse(deadlineAt);
  const nowMs =
    now instanceof Date
      ? now.getTime()
      : typeof now === "string"
        ? Date.parse(now)
        : now;

  if (!Number.isFinite(deadlineMs)) {
    throw new Error("Practice deadline is invalid");
  }
  if (!Number.isFinite(nowMs)) {
    throw new Error("Current time is invalid");
  }

  return Math.max(0, deadlineMs - nowMs);
}

export function formatRemainingTime(remainingMs: number): string {
  if (!Number.isFinite(remainingMs) || remainingMs < 0) {
    throw new Error("Remaining time must be a non-negative finite number");
  }

  const totalSeconds = Math.ceil(remainingMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
