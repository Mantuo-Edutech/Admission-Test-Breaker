import { describe, expect, it } from "vitest";
import {
  formatRemainingTime,
  remainingTimeMs,
} from "../../../../src/features/practice/domain/timer.js";

describe("practice deadline timer", () => {
  it("derives remaining time from the deadline and clamps at zero", () => {
    expect(
      remainingTimeMs(
        "2026-07-13T01:15:00.000Z",
        "2026-07-13T01:14:30.000Z",
      ),
    ).toBe(30_000);
    expect(
      remainingTimeMs(
        "2026-07-13T01:15:00.000Z",
        "2026-07-13T01:16:00.000Z",
      ),
    ).toBe(0);
  });

  it("accepts Date and epoch inputs without starting a decrementing clock", () => {
    expect(
      remainingTimeMs(
        "2026-07-13T01:15:00.000Z",
        new Date("2026-07-13T01:14:59.500Z"),
      ),
    ).toBe(500);
    expect(
      remainingTimeMs(
        "2026-07-13T01:15:00.000Z",
        Date.parse("2026-07-13T01:14:00.000Z"),
      ),
    ).toBe(60_000);
  });

  it("formats exam time without exposing milliseconds", () => {
    expect(formatRemainingTime(75 * 60_000)).toBe("75:00");
    expect(formatRemainingTime(30_001)).toBe("00:31");
    expect(formatRemainingTime(0)).toBe("00:00");
  });

  it("rejects invalid deadlines instead of silently expiring", () => {
    expect(() => remainingTimeMs("not-a-date", Date.now())).toThrow(
      /deadline/,
    );
  });
});
