import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

function blockBetween(css: string, start: string, end: string): string {
  const startIndex = css.indexOf(start);
  const endIndex = css.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) {
    throw new Error(`Missing CSS contract markers: ${start} / ${end}`);
  }
  return css.slice(startIndex, endIndex);
}

describe("responsive editorial front-door CSS", () => {
  it("keeps the four-to-two-to-one exam layout contract", async () => {
    const css = await readFile("src/styles/practice.css", "utf8");
    const frontDoor = blockBetween(
      css,
      "/* Multi-exam front door */",
      "/* TMUA exam space */",
    );

    expect(frontDoor).toMatch(
      /\.exam-entry-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,/su,
    );
    expect(frontDoor).toMatch(
      /@media \(max-width: 55rem\)[\s\S]*?\.exam-entry-grid\s*\{[^}]*repeat\(2,/u,
    );
    expect(frontDoor).toMatch(
      /@media \(max-width: 35rem\)[\s\S]*?\.exam-entry-grid\s*\{[^}]*grid-template-columns:\s*1fr/u,
    );
  });

  it("protects touch, focus, solid-color, and headline wrapping decisions", async () => {
    const css = await readFile("src/styles/practice.css", "utf8");
    const frontDoor = blockBetween(
      css,
      "/* Multi-exam front door */",
      "/* TMUA exam space */",
    );

    expect(frontDoor).toMatch(/\.exam-entry\s*\{[^}]*min-height:\s*20rem/su);
    expect(frontDoor).toContain(".exam-entry:focus-visible");
    expect(frontDoor).not.toContain("linear-gradient");
    expect(frontDoor).toMatch(
      /\.front-door-hero h1\s*\{[^}]*max-width:\s*100%/su,
    );
    expect(css).toMatch(
      /\.tmua-hub-hero h1 > span\s*\{[^}]*display:\s*block/su,
    );
  });
});
