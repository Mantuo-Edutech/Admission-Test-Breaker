import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

const audit = {
  generatedAt: "2026-07-13T00:00:00.000Z",
  generatedBy: "tmua-corpus-cli",
  schemaVersion: 1,
  changeReason: "contract test",
} as const;

async function validator(name: string) {
  const schema = JSON.parse(
    await readFile(`content/tmua/schemas/${name}.schema.json`, "utf8"),
  ) as object;
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

function linkedOfficialResource() {
  return {
    id: "tmua-official-2023-paper-1-worked-solutions",
    edition: "2023",
    paper: 1,
    documentType: "worked_solutions",
    officialUrl:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/tmua-2023-p1.pdf",
    expectedPages: 22,
    availability: "linked",
    reviewStatus: "verified",
    audit,
  };
}

function paperRecord() {
  return {
    id: "tmua-2023-p1",
    edition: "2023",
    paper: 1,
    durationMinutes: 75,
    expectedQuestionCount: 20,
    questionSourceId: "tmua-official-2023-paper-1",
    answerSourceId: "tmua-official-2023-answer-key",
    workedSolutionSourceId:
      "tmua-official-2023-paper-1-worked-solutions",
    completeness: "complete",
    contentStage: "published",
    onlineQuestionCount: 20,
    audit,
  };
}

function questionRecord() {
  return {
    id: "tmua-2023-p1-q01",
    exam: "TMUA",
    edition: "2023",
    paper: 1,
    questionNumber: 1,
    sourceType: "past_paper",
    questionSourceId: "tmua-official-2023-paper-1",
    answerSourceId: "tmua-official-2023-answer-key",
    workedSolutionSourceId:
      "tmua-official-2023-paper-1-worked-solutions",
    prompt: null,
    options: [],
    correctAnswer: null,
    onlineContentId: "tmua-2023-p1-q01",
    knowledgeTags: [],
    skillTags: [],
    errorTypes: [],
    syllabusLevel: "CORE",
    contentStage: "published",
    reviewStatus: "verified",
    audit,
  };
}

function publicSummary() {
  return {
    schemaVersion: 1,
    exam: "TMUA",
    auditedAt: "2026-07-13T00:00:00.000Z",
    importedPdfPathCount: 96,
    canonicalSourceCount: 46,
    officialSupplementCount: 4,
    paperCount: 18,
    questionShellCount: 360,
    publishedQuestionCount: 20,
    editions: [
      {
        id: "2023",
        label: "2023",
        papers: [
          { paper: 1, contentStage: "published", onlineQuestionCount: 20 },
          { paper: 2, contentStage: "indexed", onlineQuestionCount: 0 },
        ],
      },
    ],
  };
}

describe("TMUA corpus contracts", () => {
  it("allows a linked official resource without local file fields", async () => {
    const validate = await validator("official-resource");
    expect(validate(linkedOfficialResource()), validate.errors ?? []).toBe(true);
  });

  it("requires local path, digest and retrieval time when downloaded", async () => {
    const validate = await validator("official-resource");
    const record = { ...linkedOfficialResource(), availability: "downloaded" };
    expect(validate(record)).toBe(false);
    expect(validate.errors?.map((error) => error.instancePath)).toEqual(
      expect.arrayContaining(["", "", ""]),
    );
  });

  it("rejects unsafe persisted official paths", async () => {
    const validate = await validator("official-resource");
    for (const localPath of [
      "/Users/example/Tmua/file.pdf",
      "Tmua/../file.pdf",
      "Tmua\\file.pdf",
    ]) {
      const record = {
        ...linkedOfficialResource(),
        availability: "downloaded",
        localPath,
        sha256: "a".repeat(64),
        retrievedAt: "2026-07-13T00:00:00.000Z",
      };
      expect(validate(record), localPath).toBe(false);
    }
  });

  it("bounds the number of online questions per paper", async () => {
    const validate = await validator("paper");
    expect(validate(paperRecord()), validate.errors ?? []).toBe(true);
    expect(validate({ ...paperRecord(), onlineQuestionCount: 21 })).toBe(false);
  });

  it("keeps an index question as a shell instead of extracted content", async () => {
    const validate = await validator("question");
    expect(validate(questionRecord()), validate.errors ?? []).toBe(true);
    expect(validate({ ...questionRecord(), prompt: "unreviewed text" })).toBe(
      false,
    );
    expect(validate({ ...questionRecord(), options: ["A"] })).toBe(false);
    expect(validate({ ...questionRecord(), correctAnswer: "A" })).toBe(false);
  });

  it("rejects a public summary with more published items than shells", async () => {
    const validate = await validator("public-summary");
    expect(validate(publicSummary()), validate.errors ?? []).toBe(true);
    expect(
      validate({
        ...publicSummary(),
        questionShellCount: 10,
        publishedQuestionCount: 20,
      }),
    ).toBe(false);
  });
});
