import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { siteTitleForPathname } from "../../src/app/site-metadata.js";

describe("multi-exam site metadata", () => {
  it("identifies Mantou and every supported exam instead of presenting the site as TMUA-only", async () => {
    const html = await readFile("index.html", "utf8");

    expect(html).toContain("<title>满托｜英国入学考试练习与诊断</title>");
    expect(html).toContain("不再为升学考试而焦虑");
    expect(html).toContain('name="description"');
    expect(html).toContain('property="og:site_name" content="满托 UK Test"');
    expect(html).toContain('property="og:title" content="满托｜英国入学考试练习与诊断"');
    expect(html).not.toContain("<title>TMUA 练习场</title>");
  });

  it("ships the Mantou favicon and installable app identity", async () => {
    const [html, manifest] = await Promise.all([
      readFile("index.html", "utf8"),
      readFile("public/site.webmanifest", "utf8"),
    ]);

    expect(html).toContain('href="/favicon-32.png"');
    expect(html).toContain('href="/favicon-16.png"');
    expect(html).toContain('href="/apple-touch-icon.png"');
    expect(html).toContain('href="/site.webmanifest"');
    expect(JSON.parse(manifest)).toMatchObject({
      name: "满托 UK Test｜英国入学考试练习与诊断",
      short_name: "满托 UK Test",
      theme_color: "#63528c",
    });
  });

  it("keeps the current task visible before the Mantou brand on inner pages", () => {
    expect(siteTitleForPathname("/")).toBe("满托｜英国入学考试练习与诊断");
    expect(siteTitleForPathname("/exams/tmua")).toBe("TMUA 备考｜满托");
    expect(siteTitleForPathname("/exams/tmua/past-papers")).toBe("历年真题｜TMUA｜满托");
    expect(siteTitleForPathname("/exams/esat/coverage")).toBe("知识覆盖｜ESAT｜满托");
    expect(siteTitleForPathname("/practice/tmua-2023-p1")).toBe("在线练习｜满托");
    expect(siteTitleForPathname("/login")).toBe("登录｜满托");
  });
});
