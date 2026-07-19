import { describe, expect, it } from "vitest";
import {
  ESAT_KNOWLEDGE_UNITS,
  buildEsatCoverage,
  createEsatPreparationPlan,
  loadEsatPreparationPlan,
  saveEsatPreparationPlan,
  type BrowserStorage,
} from "../../../src/features/catalog/esat-plan.js";

class MemoryStorage implements BrowserStorage {
  value: string | null = null;
  getItem(): string | null { return this.value; }
  setItem(_key: string, value: string): void { this.value = value; }
}

describe("ESAT staged preparation plan", () => {
  it("loads every official top-level ESAT knowledge unit", () => {
    expect(Object.fromEntries(
      Object.entries(ESAT_KNOWLEDGE_UNITS).map(([moduleId, units]) => [moduleId, units.length]),
    )).toEqual({
      "mathematics-1": 7,
      "mathematics-2": 8,
      physics: 7,
      chemistry: 17,
      biology: 11,
    });
  });

  it("round-trips a valid course and module plan", () => {
    const storage = new MemoryStorage();
    const plan = createEsatPreparationPlan({
      programmeIds: ["imperial-h401"],
      moduleIds: ["mathematics-1", "physics", "mathematics-2"],
      entryCycle: "2027",
      curriculumId: "a-level",
      courseIds: ["al-mathematics", "al-further-mathematics", "al-physics"],
      updatedAt: "2026-07-17T15:00:00.000Z",
    });

    saveEsatPreparationPlan(storage, plan);
    expect(loadEsatPreparationPlan(storage)).toEqual(plan);
    expect(buildEsatCoverage(plan).map((result) => result.status)).toEqual([
      "covered",
      "covered",
      "covered",
    ]);
  });

  it("rejects modules that do not satisfy the selected programme", () => {
    expect(() => createEsatPreparationPlan({
      programmeIds: ["imperial-h401"],
      moduleIds: ["mathematics-1", "chemistry", "mathematics-2"],
      entryCycle: "2027",
      curriculumId: null,
      courseIds: [],
      updatedAt: "2026-07-17T15:00:00.000Z",
    })).toThrow(/do not satisfy/u);
  });

  it("distinguishes partial coverage from missing course evidence", () => {
    const plan = createEsatPreparationPlan({
      programmeIds: ["imperial-h401"],
      moduleIds: ["mathematics-1", "physics", "mathematics-2"],
      entryCycle: "2027",
      curriculumId: "ap",
      courseIds: ["ap-calculus-bc"],
      updatedAt: "2026-07-17T15:00:00.000Z",
    });

    const coverage = buildEsatCoverage(plan);
    expect(Object.fromEntries(coverage.map((result) => [result.moduleId, result.status]))).toEqual({
      "mathematics-1": "partial",
      physics: "not-evidenced",
      "mathematics-2": "partial",
    });
    expect(coverage.find((result) => result.moduleId === "mathematics-1")?.missingUnits.map((unit) => unit.id)).toEqual([
      "m1-units",
      "m1-statistics",
      "m1-probability",
    ]);
    expect(coverage.find((result) => result.moduleId === "mathematics-2")?.coveredUnits.map((unit) => unit.id)).toContain("m2-integration");
    expect(coverage.find((result) => result.moduleId === "mathematics-2")?.partialUnits.map((unit) => unit.id)).toEqual([
      "m2-coordinate-geometry",
    ]);
  });

  it("merges selected AP courses and reports exact remaining units", () => {
    const plan = createEsatPreparationPlan({
      programmeIds: ["imperial-h401"],
      moduleIds: ["mathematics-1", "physics", "mathematics-2"],
      entryCycle: "2027",
      curriculumId: "ap",
      courseIds: ["ap-precalculus", "ap-calculus-bc", "ap-physics-1", "ap-physics-c"],
      updatedAt: "2026-07-17T15:00:00.000Z",
    });

    const coverage = buildEsatCoverage(plan);
    expect(coverage.find((result) => result.moduleId === "mathematics-1")?.missingUnits.map((unit) => unit.labelEn)).toEqual([
      "Statistics",
      "Probability",
    ]);
    expect(coverage.find((result) => result.moduleId === "mathematics-2")?.partialUnits.map((unit) => unit.labelEn)).toEqual([
      "Coordinate geometry",
    ]);
    expect(coverage.find((result) => result.moduleId === "physics")?.missingUnits.map((unit) => unit.labelEn)).toEqual([
      "Thermal physics",
      "Radioactivity",
    ]);
  });
});
