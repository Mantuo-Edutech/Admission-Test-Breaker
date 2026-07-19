import { describe, expect, it } from "vitest";
import {
  PREPARATION_CATALOG,
  qualificationById,
  qualificationsForSystem,
} from "../../../src/features/preparation-profile/catalog.js";

describe("versioned curriculum catalog", () => {
  it("contains the versioned A-Level, IB and AP mathematics qualifications", () => {
    expect(PREPARATION_CATALOG.map((qualification) => qualification.id)).toEqual([
      "caie-9709-2026-2027",
      "caie-9231-2026-2027",
      "pearson-ial-mathematics-issue-3",
      "pearson-ial-further-mathematics-issue-3",
      "ib-aa-sl-first-assessment-2021",
      "ib-aa-hl-first-assessment-2021",
      "ib-ai-sl-first-assessment-2021",
      "ib-ai-hl-first-assessment-2021",
      "ap-precalculus-effective-fall-2026",
      "ap-calculus-ab-2020-current",
      "ap-calculus-bc-2020-current",
    ]);
    expect(
      qualificationById("caie-9709-2026-2027")?.units.map((unit) => unit.id),
    ).toEqual(["p1", "p2", "p3", "m1", "s1", "s2"]);
  });

  it("records the official Pearson Mathematics unit choices and provenance", () => {
    const mathematics = qualificationById("pearson-ial-mathematics-issue-3");

    expect(mathematics?.units.map((unit) => unit.id)).toEqual([
      "p1",
      "p2",
      "p3",
      "p4",
      "m1",
      "m2",
      "s1",
      "s2",
      "d1",
    ]);
    expect(mathematics).toMatchObject({
      specificationVersion: "Issue 3 - April 2019",
      sourceRegistryId: "pearson-ial",
      sourceDocument:
        "research/official-sources/files/pearson-ial/mathematics-specification-2018-current.pdf",
    });
    expect(mathematics?.certificationRules?.at(1)).toContain("M1+S1");
  });

  it("filters qualifications without mixing examination boards", () => {
    expect(qualificationsForSystem("caie")).toHaveLength(2);
    expect(
      qualificationsForSystem("caie").every((qualification) => qualification.system === "caie"),
    ).toBe(true);
    expect(qualificationsForSystem("ib")).toHaveLength(4);
    expect(qualificationsForSystem("ap")).toHaveLength(3);
  });

  it("keeps IB and AP provenance on their current official documents", () => {
    expect(qualificationById("ib-aa-hl-first-assessment-2021")).toMatchObject({
      specificationVersion: "First assessment 2021",
      sourceRegistryId: "ibo",
      sourceDocument: expect.stringContaining("ibo.org/contentassets/"),
    });
    expect(qualificationById("ap-precalculus-effective-fall-2026")).toMatchObject({
      specificationVersion: "Effective Fall 2026",
      sourceRegistryId: "college-board",
      sourceDocument: expect.stringContaining("apcentral.collegeboard.org/media/pdf/"),
    });
    expect(
      qualificationById("ap-calculus-bc-2020-current")?.units.map((unit) => unit.id),
    ).toEqual(["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9", "u10"]);
  });
});
