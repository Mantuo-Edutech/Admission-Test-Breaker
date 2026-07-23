import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const publicCopyRoots = [
  "src/features/catalog/pages",
  "src/features/library/pages",
  "src/features/practice/pages",
  "src/features/preparation-profile/pages",
  "src/features/notes/pages",
  "src/features/data-rights/pages",
] as const;

const internalProductionPhrases = [
  "已归档试卷",
  "已完成原生排版",
  "在线转换",
  "原生上线",
  "LOCAL SOURCE AUDIT",
  "本地校验文件",
  "已纳入本站来源清单",
  "当前没有通过发布门",
  "来源已发现",
  "虚假入口",
  "教学预览版本",
  "仍待独立教师终审",
  "原件仅用于内部",
  "已核验资料概览",
  "外部跳转",
] as const;

async function collectTsxFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(path);
    return entry.isFile() && path.endsWith(".tsx") ? [path] : [];
  }));
  return files.flat();
}

describe("public trust copy contract", () => {
  it("keeps internal content-production language out of learner-facing pages", async () => {
    const files = (await Promise.all(publicCopyRoots.map(collectTsxFiles))).flat();
    const violations: string[] = [];

    for (const file of files) {
      const source = await readFile(file, "utf8");
      for (const phrase of internalProductionPhrases) {
        if (source.includes(phrase)) violations.push(`${file}: ${phrase}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
