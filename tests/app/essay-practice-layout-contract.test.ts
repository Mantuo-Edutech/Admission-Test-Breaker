import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("responsive essay practice layout contract", () => {
  it("uses a single-column writing desk and preserves a usable phone editor", async () => {
    const css = await readFile("src/styles/practice.css", "utf8");

    expect(css).toMatch(/\.exam-layout--essay\s*\{[^}]*grid-template-columns:\s*1fr;/su);
    expect(css).toMatch(/\.essay-editor textarea\s*\{[^}]*min-height:\s*28rem;/su);
    expect(css).toMatch(/@media \(max-width: 52rem\)[\s\S]*?\.essay-editor textarea\s*\{[^}]*min-height:\s*22rem;/u);
    expect(css).toMatch(/\.essay-submission-review\s*\{[^}]*border:/su);
  });
});
