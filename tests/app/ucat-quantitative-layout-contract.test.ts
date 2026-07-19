import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("UCAT Quantitative Reasoning responsive tools contract", () => {
  it("keeps data tables horizontally contained and the calculator inside the viewport", async () => {
    const css = await readFile("src/styles/practice.css", "utf8");

    expect(css).toMatch(/\.question-data-table-wrap\s*\{[^}]*overflow-x:\s*auto;/su);
    expect(css).toMatch(/\.question-data-table\s*\{[^}]*min-width:\s*34rem;/su);
    expect(css).toMatch(/\.calculator-panel\s*\{[^}]*width:\s*min\(19rem, calc\(100vw - 2rem\)\);/su);
    expect(css).toMatch(/\.calculator-keypad\s*\{[^}]*grid-template-columns:\s*repeat\(4,/su);
  });
});
