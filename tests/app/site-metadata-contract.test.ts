import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("multi-exam site metadata", () => {
  it("identifies Mantou and every supported exam instead of presenting the site as TMUA-only", async () => {
    const html = await readFile("index.html", "utf8");

    expect(html).toContain("<title>满托入学考试练习场 | TMUA · ESAT · TARA · LNAT · UCAT</title>");
    expect(html).toContain("不再为升学考试而焦虑");
    expect(html).toContain('name="description"');
    expect(html).toContain('property="og:title" content="满托英国入学考试练习场"');
    expect(html).not.toContain("<title>TMUA 练习场</title>");
  });
});
