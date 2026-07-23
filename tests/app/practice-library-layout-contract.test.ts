import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const practiceLibraryPages = [
  "src/features/catalog/pages/TmuaPastPapersPage.tsx",
  "src/features/catalog/pages/EsatPastPapersPage.tsx",
  "src/features/catalog/pages/AssessmentPracticeLibraryPage.tsx",
] as const;

describe("action-first practice library design contract", () => {
  it("keeps every exam on the shared action-first component boundary", async () => {
    const sources = await Promise.all(practiceLibraryPages.map((file) => readFile(file, "utf8")));

    for (const source of sources) {
      expect(source).toContain("PracticeLibraryHero");
      expect(source).toContain("PracticeEntrySection");
      expect(source).not.toMatch(/审核|校验|转换|归档|资料状态/u);
    }
  });

  it("makes the whole compact card actionable and preserves phone density", async () => {
    const [component, css] = await Promise.all([
      readFile("src/features/catalog/components/PracticeLibrary.tsx", "utf8"),
      readFile("src/styles/practice.css", "utf8"),
    ]);

    expect(component).toMatch(/<li key=\{entry\.id\}>\s*<Link/su);
    expect(component).toContain('aria-label={`${title} ${titleEn}`}');
    expect(css).toMatch(/\.practice-entry-grid a\s*\{[^}]*min-height:\s*10\.5rem;/su);
    expect(css).toMatch(/@media \(max-width: 35rem\)[\s\S]*?\.practice-entry-grid a\s*\{[^}]*min-height:\s*9\.5rem;/u);
  });
});
