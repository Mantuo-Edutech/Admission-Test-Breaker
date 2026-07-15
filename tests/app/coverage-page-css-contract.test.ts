import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("course coverage responsive hierarchy", () => {
  it("makes the teacher verdict the primary visual block", async () => {
    const css = await readFile("src/styles/practice.css", "utf8");
    expect(css).toContain(".course-coverage-verdict__primary");
    expect(css).toMatch(
      /\.course-coverage-verdict__score strong\s*\{[\s\S]*?font-family: var\(--font-serif\)/u,
    );
    expect(css).toContain("background: rgba(63, 114, 90, 0.08)");
  });

  it("collapses verdicts and study topics for phone layouts", async () => {
    const css = await readFile("src/styles/practice.css", "utf8");
    expect(css).toMatch(
      /@media \(max-width: 45rem\)[\s\S]*\.course-coverage-verdict__primary\s*\{[\s\S]*grid-template-columns: 1fr/u,
    );
    expect(css).toMatch(
      /@media \(max-width: 45rem\)[\s\S]*\.course-coverage-item__topics ul\s*\{[\s\S]*grid-template-columns: 1fr/u,
    );
  });
});
