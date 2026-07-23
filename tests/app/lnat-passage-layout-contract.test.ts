import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("LNAT passage practice responsive layout contract", () => {
  it("uses a contained desktop split view and collapses it for tablet and phone", async () => {
    const css = await readFile("src/styles/practice.css", "utf8");

    expect(css).toMatch(/\.question-card--with-passage\s+\.question-card__content\s*\{[^}]*grid-template-columns:/su);
    expect(css).toMatch(/\.question-card__passage[\s\S]*?overflow-y:\s*auto;/u);
    expect(css).toMatch(/@media \(max-width: 52rem\)[\s\S]*?\.question-card--with-passage\s+\.question-card__content\s*\{[^}]*display:\s*block;/u);
    expect(css).toMatch(/@media \(max-width: 52rem\)[\s\S]*?\.question-card__passage,[\s\S]*?overflow:\s*visible;/u);
  });
});
