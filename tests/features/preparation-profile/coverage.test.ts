import { describe, expect, it } from "vitest";
import { buildCourseCoverageReport } from "../../../src/features/preparation-profile/coverage.js";
import { createPreparationProfile } from "../../../src/features/preparation-profile/domain.js";

function caieProfile(unitIds: string[]) {
  return createPreparationProfile({
    guestSpaceId: "gsp_coverage-test",
    exam: "TMUA",
    entryCycle: "2027",
    curriculumSystem: "caie",
    selections: [
      { qualificationId: "caie-9709-2026-2027", unitIds },
    ],
    experience: "new",
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  });
}

describe("zero-token TMUA course coverage mapping", () => {
  it("maps CAIE Pure Mathematics 1 without inventing logarithm or reasoning coverage", () => {
    const report = buildCourseCoverageReport(caieProfile(["p1"]));

    expect(report.mappingVersion).toBe("2026-07-19.2");
    expect(report.directCount).toBe(7);
    expect(report.relatedCount).toBe(0);
    expect(report.notEvidencedFoundationHours).toEqual({ min: 9, max: 14 });
    expect(report.domains.find((domain) => domain.id === "integration")).toMatchObject({
      status: "direct",
      labelEn: "Integration",
      evidence: [expect.stringContaining("Pure Mathematics 1")],
      reviewMinutes: { min: 60, max: 90 },
    });
    expect(
      report.domains.find((domain) => domain.id === "exponentials-and-logarithms"),
    ).toMatchObject({
      status: "not-evidenced",
      labelEn: "Exponentials & Logarithms",
      evidence: [],
      foundationHours: { min: 2, max: 3 },
      studyTopics: [
        { zh: "指数与对数运算律", en: "Laws of Exponents & Logarithms" },
        expect.any(Object),
        expect.any(Object),
      ],
    });
    expect(
      report.domains.find((domain) => domain.id === "mathematical-reasoning"),
    ).toMatchObject({ status: "not-evidenced", evidence: [] });
    expect(
      report.domains.find((domain) => domain.id === "supporting-knowledge"),
    ).toMatchObject({ status: "not-evidenced", evidence: [] });
  });

  it("combines selected units using the strongest reviewed mapping", () => {
    const report = buildCourseCoverageReport(caieProfile(["p1", "p2"]));

    expect(report.directCount).toBe(8);
    expect(
      report.domains.find((domain) => domain.id === "exponentials-and-logarithms"),
    ).toMatchObject({
      status: "direct",
      evidence: [expect.stringContaining("Pure Mathematics 2")],
    });
  });

  it("turns related curriculum evidence into a gap-check plan", () => {
    const profile = createPreparationProfile({
      ...caieProfile(["p1"]),
      selections: [
        { qualificationId: "caie-9231-2026-2027", unitIds: ["fp1"] },
      ],
    });
    const report = buildCourseCoverageReport(profile);

    expect(report.relatedCount).toBe(5);
    expect(
      report.domains.find((domain) => domain.id === "algebra-and-functions"),
    ).toMatchObject({
      status: "related",
      gapCheckMinutes: { min: 45, max: 60 },
      foundationHours: { min: 4, max: 6 },
    });
  });

  it("does not turn mechanics or statistics modules into TMUA pure-mathematics evidence", () => {
    const profile = createPreparationProfile({
      ...caieProfile(["p1"]),
      selections: [
        { qualificationId: "caie-9709-2026-2027", unitIds: ["m1", "s1"] },
      ],
    });
    const report = buildCourseCoverageReport(profile);

    expect(report.directCount).toBe(0);
    expect(report.relatedCount).toBe(0);
    expect(report.notEvidencedCount).toBe(10);
  });

  it("maps completed IB AA topics directly while keeping Paper 2 logic as a gap check", () => {
    const report = buildCourseCoverageReport(createPreparationProfile({
      guestSpaceId: "gsp_ib-aa-coverage",
      exam: "TMUA",
      entryCycle: "2027",
      curriculumSystem: "ib",
      selections: [{
        qualificationId: "ib-aa-hl-first-assessment-2021",
        unitIds: ["number-algebra", "functions", "geometry-trigonometry", "calculus"],
      }],
      experience: "sampled",
      createdAt: "2026-07-19T00:00:00.000Z",
      updatedAt: "2026-07-19T00:00:00.000Z",
    }));

    expect(report.domains.find((domain) => domain.id === "algebra-and-functions"))
      .toMatchObject({
        status: "direct",
        evidence: expect.arrayContaining([expect.stringContaining("Analysis & Approaches HL")]),
      });
    expect(report.domains.find((domain) => domain.id === "integration"))
      .toMatchObject({ status: "direct" });
    expect(report.domains.find((domain) => domain.id === "mathematical-reasoning"))
      .toMatchObject({ status: "not-evidenced" });
  });

  it("treats IB AI as related evidence because TMUA requires exact non-calculator transfer", () => {
    const report = buildCourseCoverageReport(createPreparationProfile({
      guestSpaceId: "gsp_ib-ai-coverage",
      exam: "TMUA",
      entryCycle: "2027",
      curriculumSystem: "ib",
      selections: [{
        qualificationId: "ib-ai-hl-first-assessment-2021",
        unitIds: ["functions", "geometry-trigonometry", "calculus"],
      }],
      experience: "sampled",
      createdAt: "2026-07-19T00:00:00.000Z",
      updatedAt: "2026-07-19T00:00:00.000Z",
    }));

    expect(report.directCount).toBe(0);
    expect(report.domains.find((domain) => domain.id === "trigonometry"))
      .toMatchObject({ status: "related" });
    expect(report.domains.find((domain) => domain.id === "integration"))
      .toMatchObject({ status: "related" });
  });

  it("combines AP Precalculus and Calculus without inventing geometry or formal-logic coverage", () => {
    const report = buildCourseCoverageReport(createPreparationProfile({
      guestSpaceId: "gsp_ap-coverage",
      exam: "TMUA",
      entryCycle: "2027",
      curriculumSystem: "ap",
      selections: [
        { qualificationId: "ap-precalculus-effective-fall-2026", unitIds: ["u1", "u2", "u3"] },
        { qualificationId: "ap-calculus-ab-2020-current", unitIds: ["u2", "u5", "u6"] },
      ],
      experience: "sampled",
      createdAt: "2026-07-19T00:00:00.000Z",
      updatedAt: "2026-07-19T00:00:00.000Z",
    }));

    expect(report.domains.find((domain) => domain.id === "exponentials-and-logarithms"))
      .toMatchObject({ status: "direct" });
    expect(report.domains.find((domain) => domain.id === "differentiation"))
      .toMatchObject({ status: "direct" });
    expect(report.domains.find((domain) => domain.id === "coordinate-geometry"))
      .toMatchObject({ status: "related" });
    expect(report.domains.find((domain) => domain.id === "mathematical-reasoning"))
      .toMatchObject({ status: "related" });
  });
});
