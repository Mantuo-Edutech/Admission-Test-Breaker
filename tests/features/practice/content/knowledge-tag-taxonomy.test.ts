import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  hasKnowledgeTagLabel,
  KNOWLEDGE_TAGS,
  knowledgeTagLabel,
} from "../../../../src/features/practice/content/knowledge-tag-taxonomy.js";

interface TaggedQuestion {
  readonly knowledgeTags: readonly string[];
}

interface TaggedPracticeAsset {
  readonly questions?: readonly TaggedQuestion[];
  readonly scenarios?: readonly TaggedQuestion[];
}

function taggedRecords(asset: TaggedPracticeAsset, file: string): readonly TaggedQuestion[] {
  if (Array.isArray(asset.questions)) return asset.questions;
  if (Array.isArray(asset.scenarios)) return asset.scenarios;
  throw new Error(`${file} must expose tagged questions or compact tagged scenarios`);
}

async function publishedKnowledgeTags(): Promise<Set<string>> {
  const tmua = JSON.parse(await readFile("content/tmua/questions/index.json", "utf8")) as TaggedQuestion[];
  const tags = new Set(tmua.flatMap((question) => question.knowledgeTags));
  for (const exam of ["tmua", "esat", "tara", "lnat", "ucat"]) {
    const directory = join("content", exam, "original-practice");
    for (const file of (await readdir(directory)).filter((name) => name.endsWith(".json"))) {
      const paper = JSON.parse(
        await readFile(join(directory, file), "utf8"),
      ) as TaggedPracticeAsset;
      for (const question of taggedRecords(paper, join(directory, file))) {
        for (const tag of question.knowledgeTags) tags.add(tag);
      }
    }
  }
  return tags;
}

describe("bilingual knowledge-tag taxonomy", () => {
  it("covers every tag in all currently published practice assets", async () => {
    const published = await publishedKnowledgeTags();
    const taxonomyIds = new Set(KNOWLEDGE_TAGS.map((entry) => entry.id));

    expect([...published].filter((tag) => !hasKnowledgeTagLabel(tag))).toEqual([]);
    expect([...taxonomyIds].filter((tag) => !published.has(tag))).toEqual([]);
  });

  it("returns a clear bilingual label instead of exposing a machine id", () => {
    expect(knowledgeTagLabel("ucat-qr-percentage-decrease")).toBe(
      "数量推理：百分比下降 · Quantitative Reasoning: Percentage Decrease",
    );
    expect(knowledgeTagLabel("not-yet-published")).toBe(
      "待归类知识主题 · Topic pending classification",
    );
  });
});
