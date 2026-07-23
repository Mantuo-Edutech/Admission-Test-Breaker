import { describe, expect, it } from "vitest";
import { ESAT_KNOWLEDGE_UNITS } from "../../../src/features/catalog/esat-plan.js";
import {
  ESAT_MATHEMATICS_REVIEW_NOTES,
  ESAT_SCIENCE_REVIEW_NOTES,
} from "../../../src/features/notes/content/esat-review-notes.js";
import { LNAT_REVIEW_NOTES } from "../../../src/features/notes/content/lnat-review-notes.js";
import {
  validateReviewNotesDocument,
} from "../../../src/features/notes/content/review-notes.js";
import { TARA_REVIEW_NOTES } from "../../../src/features/notes/content/tara-review-notes.js";
import { UCAT_REVIEW_NOTES } from "../../../src/features/notes/content/ucat-review-notes.js";

describe("multi-exam Review Notes model", () => {
  it("maps the ESAT mathematics notes to all 15 exact coverage units", () => {
    expect(() => validateReviewNotesDocument(ESAT_MATHEMATICS_REVIEW_NOTES)).not.toThrow();
    expect(ESAT_MATHEMATICS_REVIEW_NOTES.modules.map((module) => module.id)).toEqual([
      "mathematics-1",
      "mathematics-2",
    ]);
    expect(ESAT_MATHEMATICS_REVIEW_NOTES.modules[0]?.knowledgeUnits.map((unit) => unit.id)).toEqual(
      ESAT_KNOWLEDGE_UNITS["mathematics-1"].map((unit) => unit.id),
    );
    expect(ESAT_MATHEMATICS_REVIEW_NOTES.modules[1]?.knowledgeUnits.map((unit) => unit.id)).toEqual(
      ESAT_KNOWLEDGE_UNITS["mathematics-2"].map((unit) => unit.id),
    );

    const units = ESAT_MATHEMATICS_REVIEW_NOTES.modules.flatMap((module) => module.knowledgeUnits);
    expect(units).toHaveLength(15);
    expect(new Set(units.map((unit) => unit.id)).size).toBe(15);
  });

  it("contains teachable methods, original examples and active recall", () => {
    const modules = ESAT_MATHEMATICS_REVIEW_NOTES.modules;
    const methods = modules.flatMap((module) => module.methods);
    const examples = modules.flatMap((module) => module.originalWorkedExamples);
    const recall = modules.flatMap((module) => module.activeRecall);

    expect(methods).toHaveLength(6);
    expect(examples).toHaveLength(2);
    expect(examples.every((example) => example.titleZh.includes("原创例题"))).toBe(true);
    expect(recall).toHaveLength(6);
  });

  it("pins both official source files while keeping authored content independent", () => {
    expect(ESAT_MATHEMATICS_REVIEW_NOTES.officialAnchors.map((source) => source.sha256)).toEqual([
      "da9e853ec99cc0befcae5c8871e48eedc5776d7b2db07b8d5d9e2492a01452b3",
      "12ed684ee2dfb9b53355d54018ba216b5cd32161e5f6c5c9ee5e96b93cbf8844",
    ]);
    const serialized = JSON.stringify(ESAT_MATHEMATICS_REVIEW_NOTES);
    expect(serialized).not.toMatch(/public\/papers|录取概率|官方分数线|官方百分位/u);
    expect(ESAT_MATHEMATICS_REVIEW_NOTES.rightsNotice).toContain("不复制官方题目");
  });

  it("rejects an unpinned source and an example without original authorship", () => {
    const sourceInvalid = structuredClone(ESAT_MATHEMATICS_REVIEW_NOTES) as unknown as {
      officialAnchors: { sha256: string }[];
    };
    sourceInvalid.officialAnchors[0]!.sha256 = "not-a-hash";
    expect(() => validateReviewNotesDocument(sourceInvalid)).toThrow(/Invalid review notes source/u);

    const exampleInvalid = structuredClone(ESAT_MATHEMATICS_REVIEW_NOTES) as unknown as {
      modules: { originalWorkedExamples: { titleZh: string }[] }[];
    };
    exampleInvalid.modules[0]!.originalWorkedExamples[0]!.titleZh = "示例";
    expect(() => validateReviewNotesDocument(exampleInvalid)).toThrow(/not independently authored/u);
  });

  it("maps all 35 ESAT science units to the same coverage taxonomy", () => {
    expect(() => validateReviewNotesDocument(ESAT_SCIENCE_REVIEW_NOTES)).not.toThrow();
    expect(ESAT_SCIENCE_REVIEW_NOTES.modules.map((module) => module.id)).toEqual([
      "physics",
      "chemistry",
      "biology",
    ]);
    for (const module of ESAT_SCIENCE_REVIEW_NOTES.modules) {
      const moduleId = module.id as "physics" | "chemistry" | "biology";
      expect(module.knowledgeUnits.map((unit) => unit.id)).toEqual(
        ESAT_KNOWLEDGE_UNITS[moduleId].map((unit) => unit.id),
      );
    }

    const units = ESAT_SCIENCE_REVIEW_NOTES.modules.flatMap((module) => module.knowledgeUnits);
    expect(units).toHaveLength(35);
    expect(new Set(units.map((unit) => unit.id)).size).toBe(35);
    expect(ESAT_SCIENCE_REVIEW_NOTES.modules.flatMap((module) => module.methods)).toHaveLength(9);
    expect(ESAT_SCIENCE_REVIEW_NOTES.modules.flatMap((module) => module.originalWorkedExamples)).toHaveLength(3);
    expect(ESAT_SCIENCE_REVIEW_NOTES.modules.flatMap((module) => module.activeRecall)).toHaveLength(9);
  });

  it("pins all three science guides and keeps their teaching independently authored", () => {
    expect(ESAT_SCIENCE_REVIEW_NOTES.officialAnchors.map((source) => source.sha256)).toEqual([
      "da9e853ec99cc0befcae5c8871e48eedc5776d7b2db07b8d5d9e2492a01452b3",
      "234651aa05f87112e3455bae420de782683938d8d28950293649a8352dc4729e",
      "f1cfbc2ec1c44068526deeaac0b8ef7c87e245259cc89f9ed6b7c9124e359353",
      "cd5fd84f56ef0e55722841fcbdacb86eec15b0eddd16a05ea56c5d902d9e125b",
    ]);
    expect(
      ESAT_SCIENCE_REVIEW_NOTES.modules
        .flatMap((module) => module.originalWorkedExamples)
        .every((example) => example.titleZh.includes("原创例题")),
    ).toBe(true);
    const serialized = JSON.stringify(ESAT_SCIENCE_REVIEW_NOTES);

    expect(serialized).not.toMatch(/public\/papers|官方分数线|官方百分位/u);
    expect(serialized).toContain("不从课程背景直接推断分数或录取概率");
  });

  it("maps the complete top-level TARA reasoning and writing scope", () => {
    expect(() => validateReviewNotesDocument(TARA_REVIEW_NOTES)).not.toThrow();
    expect(TARA_REVIEW_NOTES.modules.map((module) => module.id)).toEqual([
      "tara-critical-thinking",
      "tara-problem-solving",
      "tara-writing-task",
      "tara-language-bridge",
    ]);
    expect(TARA_REVIEW_NOTES.modules.map((module) => module.knowledgeUnits.length)).toEqual([7, 3, 6, 5]);
    expect(TARA_REVIEW_NOTES.modules.flatMap((module) => module.knowledgeUnits)).toHaveLength(21);
    expect(TARA_REVIEW_NOTES.modules.flatMap((module) => module.methods)).toHaveLength(12);
    expect(TARA_REVIEW_NOTES.modules.flatMap((module) => module.originalWorkedExamples)).toHaveLength(4);
    expect(TARA_REVIEW_NOTES.modules.flatMap((module) => module.activeRecall)).toHaveLength(12);
  });

  it("pins the TARA specification and guide while keeping teaching original", () => {
    expect(TARA_REVIEW_NOTES.officialAnchors.map((source) => source.sha256)).toEqual([
      "d326e78305aefd999c42953de3024d403f27357ecbc0f3dd562134e8105822cd",
      "afcee1ff9dd35025000cd7c5a4cef804fa31fb3e8870d5748ec8d3ac2c45a6cb",
    ]);
    expect(
      TARA_REVIEW_NOTES.modules
        .flatMap((module) => module.originalWorkedExamples)
        .every((example) => example.titleZh.includes("原创例题")),
    ).toBe(true);
    const serialized = JSON.stringify(TARA_REVIEW_NOTES);
    expect(serialized).not.toMatch(/public\/papers|官方分数线|录取概率为|自动写作分/u);
    expect(TARA_REVIEW_NOTES.rightsNotice).toContain("不复制或改写官方题面与讲解");
  });

  it("maps the complete top-level LNAT reading, writing, EAL and timing scope", () => {
    expect(() => validateReviewNotesDocument(LNAT_REVIEW_NOTES)).not.toThrow();
    expect(LNAT_REVIEW_NOTES.modules.map((module) => module.id)).toEqual([
      "lnat-section-a",
      "lnat-section-b",
      "lnat-eal-bridge",
      "lnat-timing",
    ]);
    expect(LNAT_REVIEW_NOTES.modules.map((module) => module.knowledgeUnits.length)).toEqual([6, 6, 5, 4]);
    expect(LNAT_REVIEW_NOTES.modules.flatMap((module) => module.knowledgeUnits)).toHaveLength(21);
    expect(LNAT_REVIEW_NOTES.modules.flatMap((module) => module.methods)).toHaveLength(12);
    expect(LNAT_REVIEW_NOTES.modules.flatMap((module) => module.originalWorkedExamples)).toHaveLength(4);
    expect(LNAT_REVIEW_NOTES.modules.flatMap((module) => module.activeRecall)).toHaveLength(12);
  });

  it("pins both LNAT official guidance files while keeping teaching original", () => {
    expect(LNAT_REVIEW_NOTES.officialAnchors.map((source) => source.sha256)).toEqual([
      "b876afae5e82ef0f43cb714c37ed26a08369b3d6714b40e1fca89288829ced08",
      "a9e4447e2e53f9fd06bacd317814e961dad9174e76b487720b954a62d0f238a2",
    ]);
    expect(
      LNAT_REVIEW_NOTES.modules
        .flatMap((module) => module.originalWorkedExamples)
        .every((example) => example.titleZh.includes("原创例题")),
    ).toBe(true);
    const serialized = JSON.stringify(LNAT_REVIEW_NOTES);
    expect(serialized).not.toMatch(/public\/papers|官方换算分|录取概率为|自动作文分/u);
    expect(LNAT_REVIEW_NOTES.rightsNotice).toContain("不复制或改写官方文章、题目、选项与讲解");
  });

  it("maps the complete top-level UCAT four-subtest and tool scope", () => {
    expect(() => validateReviewNotesDocument(UCAT_REVIEW_NOTES)).not.toThrow();
    expect(UCAT_REVIEW_NOTES.modules.map((module) => module.id)).toEqual([
      "ucat-verbal-reasoning",
      "ucat-decision-making",
      "ucat-quantitative-reasoning",
      "ucat-situational-judgement",
      "ucat-tools-timing",
    ]);
    expect(UCAT_REVIEW_NOTES.modules.map((module) => module.knowledgeUnits.length)).toEqual([5, 6, 5, 5, 4]);
    expect(UCAT_REVIEW_NOTES.modules.flatMap((module) => module.knowledgeUnits)).toHaveLength(25);
    expect(UCAT_REVIEW_NOTES.modules.flatMap((module) => module.methods)).toHaveLength(15);
    expect(UCAT_REVIEW_NOTES.modules.flatMap((module) => module.originalWorkedExamples)).toHaveLength(5);
    expect(UCAT_REVIEW_NOTES.modules.flatMap((module) => module.activeRecall)).toHaveLength(15);
  });

  it("pins current UCAT format, tools and preparation sources while keeping teaching original", () => {
    expect(UCAT_REVIEW_NOTES.officialAnchors.map((source) => source.sha256)).toEqual([
      "9aa4a93bddcc62bf53c6196f2b38ac40240a1f781154590c772c68f179d52dbf",
      "a659bedc40b1a603cb755e75121a19a633889d2aab62b66d62378e804f7b8c7c",
      "136e3775e77f03fef4baab5bcb85a0affaba74d240981748c9cc1474cfdbf7b9",
    ]);
    expect(
      UCAT_REVIEW_NOTES.modules
        .flatMap((module) => module.originalWorkedExamples)
        .every((example) => example.titleZh.includes("原创例题")),
    ).toBe(true);
    const serialized = JSON.stringify(UCAT_REVIEW_NOTES);
    expect(serialized).not.toMatch(/public\/papers|录取概率为|保证提分|官方题库.{0,8}复制/u);
    expect(UCAT_REVIEW_NOTES.rightsNotice).toContain("不复制或改写官方题库、文章、情境、选项或讲解");
  });
});
