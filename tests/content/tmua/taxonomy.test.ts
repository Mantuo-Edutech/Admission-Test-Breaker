import { describe, expect, it } from "vitest";
import {
  loadTaxonomyDirectory,
  validateQuestionTaxonomy,
  validateTaxonomy,
} from "../../../src/content/tmua/taxonomy.js";
import type {
  AuditStamp,
  QuestionRecord,
  TaxonomyNode,
} from "../../../src/content/tmua/types.js";
import { TMUA_2023_P1 } from "../../../src/features/practice/content/tmua-2023-p1.js";

const audit: AuditStamp = {
  generatedAt: "2026-07-13T00:00:00.000Z",
  generatedBy: "tmua-corpus-cli",
  schemaVersion: 1,
  changeReason: "taxonomy test",
};

function node(
  id: string,
  input?: Partial<TaxonomyNode>,
): TaxonomyNode {
  return {
    id,
    name: id,
    parentId: null,
    level: "CORE",
    specificationRefs: [],
    prerequisites: [],
    aliases: [],
    ...input,
  };
}

function question(input?: Partial<QuestionRecord>): QuestionRecord {
  return {
    id: "tmua-2023-p1-q01",
    exam: "TMUA",
    edition: "2023",
    paper: 1,
    questionNumber: 1,
    sourceType: "past_paper",
    questionSourceId: "question-source",
    answerSourceId: "answer-source",
    workedSolutionSourceId: "solution-source",
    prompt: null,
    options: [],
    correctAnswer: null,
    knowledgeTags: [],
    skillTags: [],
    errorTypes: [],
    syllabusLevel: "CORE",
    contentStage: "indexed",
    reviewStatus: "needs_review",
    audit,
    ...input,
  };
}

describe("TMUA taxonomy files", () => {
  it("loads the approved first knowledge, skill and error vocabularies", async () => {
    const loaded = await loadTaxonomyDirectory("content/tmua/taxonomy");

    expect(loaded.knowledge.slice(0, 12).map(({ id }) => id)).toEqual([
      "algebra-and-functions",
      "sequences-and-series",
      "coordinate-geometry",
      "trigonometry",
      "exponentials-and-logarithms",
      "differentiation",
      "integration",
      "graphs-of-functions",
      "mathematical-logic",
      "mathematical-proof",
      "errors-in-proof",
      "gcse-supporting-knowledge",
    ]);
    expect(loaded.skills.slice(0, 12)).toHaveLength(12);
    expect(loaded.errorTypes).toHaveLength(12);
    expect(validateTaxonomy(loaded.all)).toEqual([]);
  });

  it("contains every tag already published by the verified 2023 Paper 1", async () => {
    const loaded = await loadTaxonomyDirectory("content/tmua/taxonomy");
    const knownIds = new Set(loaded.all.map((node) => node.id));
    const publishedTags = new Set(
      TMUA_2023_P1.questions.flatMap((question) => [
        ...question.knowledgeTags,
        ...question.skillTags,
      ]),
    );

    expect([...publishedTags].filter((tag) => !knownIds.has(tag))).toEqual([]);
  });
});

describe("TMUA taxonomy graph validation", () => {
  it.each([
    ["duplicate ID", [node("a"), node("a")], "duplicate_taxonomy_id"],
    [
      "missing parent",
      [node("a", { parentId: "missing" })],
      "missing_taxonomy_parent",
    ],
    [
      "missing prerequisite",
      [node("a", { prerequisites: ["missing"] })],
      "missing_taxonomy_prerequisite",
    ],
    [
      "self-reference",
      [node("a", { prerequisites: ["a"] })],
      "taxonomy_self_reference",
    ],
    [
      "cycle",
      [node("a", { parentId: "b" }), node("b", { parentId: "a" })],
      "taxonomy_cycle",
    ],
    ["empty name", [node("a", { name: "" })], "invalid_taxonomy_name"],
    [
      "invalid level",
      [node("a", { level: "INVALID" as TaxonomyNode["level"] })],
      "invalid_taxonomy_level",
    ],
  ])("reports a P0 for %s", (_label, nodes, expectedCode) => {
    expect(validateTaxonomy(nodes)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "P0", code: expectedCode }),
      ]),
    );
  });
});

describe("question taxonomy validation", () => {
  const taxonomy = [
    node("integration"),
    node("multi-step-planning"),
    node("calculation-slip"),
  ];

  it("allows empty tags on an indexed, unreviewed shell", () => {
    expect(validateQuestionTaxonomy([question()], taxonomy)).toEqual([]);
  });

  it("requires reviewed published content to have valid knowledge and skill tags", () => {
    const issues = validateQuestionTaxonomy(
      [
        question({
          contentStage: "published",
          reviewStatus: "verified",
          knowledgeTags: [],
          skillTags: ["unknown-skill"],
        }),
      ],
      taxonomy,
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missing_question_knowledge_tag" }),
        expect.objectContaining({ code: "unknown_question_taxonomy_tag" }),
      ]),
    );
  });

  it("accepts valid reviewed tags", () => {
    expect(
      validateQuestionTaxonomy(
        [
          question({
            contentStage: "published",
            reviewStatus: "verified",
            knowledgeTags: ["integration"],
            skillTags: ["multi-step-planning"],
            errorTypes: ["calculation-slip"],
          }),
        ],
        taxonomy,
      ),
    ).toEqual([]);
  });
});
