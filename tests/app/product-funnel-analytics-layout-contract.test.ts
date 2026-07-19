import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("product funnel analytics responsive contract", () => {
  it("collapses metrics, exam cards and stage rows for tablet and phone", async () => {
    const css = await readFile("src/styles/practice.css", "utf8");

    expect(css).toMatch(/\.funnel-analytics-metrics\s*\{[^}]*grid-template-columns:\s*repeat\(4,/su);
    expect(css).toMatch(/@media \(max-width: 61rem\)[\s\S]*\.funnel-analytics-metrics\s*\{\s*grid-template-columns:\s*repeat\(2,/su);
    expect(css).toMatch(/@media \(max-width: 40rem\)[\s\S]*\.funnel-analytics-metrics\s*\{\s*grid-template-columns:\s*1fr;/su);
    expect(css).toMatch(/@media \(max-width: 40rem\)[\s\S]*\.funnel-exam-breakdown > div\s*\{\s*grid-template-columns:\s*1fr;/su);
    expect(css).toMatch(/\.funnel-stage-ledger li\s*\{[^}]*grid-template-columns:/su);
  });
});
