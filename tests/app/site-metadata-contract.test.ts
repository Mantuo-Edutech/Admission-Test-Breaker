import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { siteTitleForPathname } from "../../src/app/site-metadata.js";

describe("multi-exam site metadata", () => {
  it("identifies Mantou and every supported exam instead of presenting the site as TMUA-only", async () => {
    const html = await readFile("index.html", "utf8");

    expect(html).toContain("<title>UK Admission Test Prep | Mantuo 满托</title>");
    expect(html).toContain("Prepare for TMUA, ESAT, TARA, LNAT and UCAT");
    expect(html).toContain('name="description"');
    expect(html).toContain('property="og:site_name" content="Mantuo UK Test"');
    expect(html).toContain('property="og:title" content="UK Admission Test Prep | Mantuo 满托"');
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
      name: "UK Admission Test Prep | Mantuo 满托",
      short_name: "Mantuo UK Test",
      lang: "en-GB",
      theme_color: "#63528c",
    });
  });

  it("keeps the current task visible before the Mantou brand on inner pages", () => {
    expect(siteTitleForPathname("/")).toBe("UK Admission Test Prep | Mantuo 满托");
    expect(siteTitleForPathname("/exams/tmua")).toBe("TMUA Prep | Mantuo 满托");
    expect(siteTitleForPathname("/exams/tmua/past-papers")).toBe("Online Practice | TMUA | Mantuo 满托");
    expect(siteTitleForPathname("/exams/esat/coverage")).toBe("Course Coverage | ESAT | Mantuo 满托");
    expect(siteTitleForPathname("/exams/tmua/resources")).toBe("Review Notes | TMUA | Mantuo 满托");
    expect(siteTitleForPathname("/exams/tmua/coaching")).toBe("Expert Guidance | TMUA | Mantuo 满托");
    expect(siteTitleForPathname("/practice/tmua-2023-p1")).toBe("Online Practice | Mantuo 满托");
    expect(siteTitleForPathname("/login")).toBe("Sign In | Mantuo 满托");
  });
});
