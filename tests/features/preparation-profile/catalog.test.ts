import { describe, expect, it } from "vitest";
import {
  PREPARATION_CATALOG,
  qualificationById,
  qualificationsForSystem,
} from "../../../src/features/preparation-profile/catalog.js";

describe("versioned curriculum catalog", () => {
  it("contains the exact first CAIE and Pearson qualifications", () => {
    expect(PREPARATION_CATALOG.map((qualification) => qualification.id)).toEqual([
      "caie-9709-2026-2027",
      "caie-9231-2026-2027",
      "pearson-ial-mathematics-issue-3",
      "pearson-ial-further-mathematics-issue-3",
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
  });
});
