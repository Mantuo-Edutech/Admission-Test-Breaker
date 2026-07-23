import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  TMUA_FOUNDATIONS_NOTES,
  validateTmuaFoundationsNotes,
} from "../../../src/features/notes/content/tmua-foundations.js";

describe("TMUA foundations notes", () => {
  it("keeps official facts, Mantou strategy and curriculum bridges distinct", () => {
    expect(TMUA_FOUNDATIONS_NOTES.examMap.officialFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ labelEn: "Two papers", valueEn: "75 minutes each" }),
        expect.objectContaining({ labelEn: "Tools", valueEn: "No calculator and no formula booklet" }),
      ]),
    );
    expect(TMUA_FOUNDATIONS_NOTES.examMap.mantouStrategy).toHaveLength(3);
    expect(TMUA_FOUNDATIONS_NOTES.curriculumBridges.map((bridge) => bridge.curriculum)).toEqual(
      expect.arrayContaining([
        "A-Level / IAL Mathematics",
        "IB Mathematics: Analysis and Approaches HL",
        "AP Precalculus + AP Calculus AB/BC",
      ]),
    );
  });

  it("contains seven chapters, nine labelled examples and twelve answerable recall questions", () => {
    const examples = TMUA_FOUNDATIONS_NOTES.chapters.flatMap((chapter) =>
      chapter.sections.flatMap((section) => section.workedExamples ?? []),
    );
    expect(TMUA_FOUNDATIONS_NOTES.chapters).toHaveLength(7);
    expect(examples).toHaveLength(9);
    expect(examples.every((example) => example.titleZh.includes("原创例题"))).toBe(true);
    expect(TMUA_FOUNDATIONS_NOTES.checkpoint.questions).toHaveLength(12);
    expect(TMUA_FOUNDATIONS_NOTES.checkpoint.questions[0]).toMatchObject({
      correctOption: 1,
      explanationZh: expect.stringContaining("B → A"),
    });
  });

  it("rejects duplicated source identities", () => {
    const invalid = structuredClone(TMUA_FOUNDATIONS_NOTES) as unknown as {
      officialAnchors: { id: string }[];
    };
    invalid.officialAnchors[1]!.id = invalid.officialAnchors[0]!.id;
    expect(() => validateTmuaFoundationsNotes(invalid)).toThrow("Official source ids must be unique");
  });

  it("ships the generated A4 PDF used by the website", () => {
    const pdf = readFileSync("public/notes/tmua/tmua-foundations-v2.pdf");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(40_000);
  });
});
