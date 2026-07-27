import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  publicHistoricPracticeForExam,
} from "../../src/features/practice/content/historic-practice-catalog.js";

const PUBLIC_LIBRARY_FILES = [
  "src/features/catalog/pages/AssessmentPracticeLibraryPage.tsx",
  "src/features/catalog/pages/EsatPastPapersPage.tsx",
  "src/features/catalog/pages/TmuaPastPapersPage.tsx",
] as const;

async function source(file: string): Promise<string> {
  return readFile(file, "utf8");
}

describe("English-first public experience and practice taxonomy", () => {
  it("keeps English as the primary shared brand and navigation language", async () => {
    const [brand, navigation, landing] = await Promise.all([
      source("src/features/navigation/components/BrandMark.tsx"),
      source("src/features/navigation/exam-navigation.ts"),
      source("src/features/practice/pages/LandingPage.tsx"),
    ]);

    expect(brand.indexOf("UK Admission Test Prep")).toBeLessThan(brand.indexOf("满托考试练习场"));
    expect(navigation).toContain('label: `${exam.name} Overview`');
    expect(navigation).toContain('label: "Practice"');
    expect(navigation).toContain('label: "Review Notes"');
    expect(landing.indexOf("No more anxiety over admission tests.")).toBeLessThan(
      landing.indexOf("不再为升学考试而焦虑"),
    );
  });

  it("does not offer starter or diagnostic entries in public practice libraries", async () => {
    const sources = await Promise.all(PUBLIC_LIBRARY_FILES.map(source));
    for (const publicLibrarySource of sources) {
      expect(publicLibrarySource).not.toMatch(/starter|short diagnostic|短诊断|起点练习/iu);
    }
  });

  it("maps public ESAT history only to clear current module labels", () => {
    const entries = publicHistoricPracticeForExam("esat");
    const modules = new Set(entries.map((entry) => entry.moduleId));

    expect(modules).toEqual(new Set(["mathematics-1", "physics", "chemistry", "biology"]));
    expect(entries.some((entry) => entry.moduleId === "engineering-mixed")).toBe(false);
    expect(entries.filter((entry) => entry.moduleId === "mathematics-1").every((entry) => (
      entry.title.includes("Mathematics 1")
    ))).toBe(true);
  });

  it("recommends complete mocks instead of starter practice", async () => {
    const preparation = await source("src/features/preparation-profile/assessment-preparation.ts");
    expect(preparation).not.toMatch(/practiceHref:\s*"[^"]*starter/iu);
    expect(preparation).toContain("full-mock-v1");
  });

  it("keeps the retired TMUA diagnostic URL as a safe compatibility redirect", async () => {
    const routes = await source("src/app/routes.tsx");
    const diagnosticRoute = routes.slice(routes.indexOf('path: "/exams/tmua/diagnostic"'));
    expect(diagnosticRoute.slice(0, 240)).toContain('Navigate to="/exams/tmua/past-papers"');
  });
});
