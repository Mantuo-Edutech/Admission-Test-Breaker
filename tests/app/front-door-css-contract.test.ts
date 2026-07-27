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
  it("keeps five exams in one compact row with touch scrolling on narrow screens", async () => {
    const css = await readFile("src/styles/practice.css", "utf8");
    const frontDoor = blockBetween(
      css,
      "/* Multi-exam front door */",
      "/* TMUA exam space */",
    );

    expect(frontDoor).toMatch(
      /\.exam-entry-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5,/su,
    );
    expect(frontDoor).toMatch(
      /@media \(max-width: 55rem\)[\s\S]*?\.exam-entry-grid\s*\{[^}]*repeat\(5,[^}]*overflow-x:\s*auto/u,
    );
    expect(frontDoor).toMatch(
      /@media \(max-width: 35rem\)[\s\S]*?\.exam-entry-grid\s*\{[^}]*repeat\(5,/u,
    );
  });

  it("protects touch, focus, solid-color, and headline wrapping decisions", async () => {
    const css = await readFile("src/styles/practice.css", "utf8");
    const frontDoor = blockBetween(
      css,
      "/* Multi-exam front door */",
      "/* TMUA exam space */",
    );

    expect(frontDoor).toMatch(/\.exam-entry\s*\{[^}]*min-height:\s*13\.5rem/su);
    expect(frontDoor).toMatch(
      /\.front-door-hero__inner\s*\{[^}]*min-height:\s*clamp\(15rem,\s*23vw,\s*18\.5rem\)/su,
    );
    expect(frontDoor).toContain(".exam-entry:focus-visible");
    expect(frontDoor).not.toContain("linear-gradient");
    expect(frontDoor).toMatch(
      /\.front-door-hero h1\s*\{[^}]*max-width:\s*100%/su,
    );
    expect(css).toMatch(
      /\.tmua-hub-hero h1 > span\s*\{[^}]*display:\s*block/su,
    );
  });

  it("keeps the preparation profile readable from desktop to phone", async () => {
    const css = await readFile("src/styles/practice.css", "utf8");

    expect(css).toMatch(
      /\.profile-panel\s*\{[^}]*grid-template-columns:\s*4\.25rem\s+minmax\(16rem,\s*0\.7fr\)\s+minmax\(0,\s*1\.3fr\)/su,
    );
    expect(css).toMatch(
      /@media \(max-width: 55rem\)[\s\S]*?\.profile-panel,[\s\S]*?grid-template-columns:\s*3\.5rem\s+minmax\(0,\s*1fr\)/u,
    );
    expect(css).toMatch(
      /@media \(max-width: 35rem\)[\s\S]*?\.profile-panel,[\s\S]*?grid-template-columns:\s*1fr/u,
    );
    expect(css).toMatch(
      /\.profile-choice,[\s\S]*?\.profile-unit\s*\{[^}]*min-height:\s*2\.75rem/su,
    );
    expect(css).not.toMatch(/\.profile-[^{]*\{[^}]*linear-gradient/su);
  });

  it("keeps the staged TMUA journey responsive without separate device logic", async () => {
    const css = await readFile("src/styles/practice.css", "utf8");
    const stagedJourney = blockBetween(
      css,
      "/* TMUA staged preparation journey */",
      "/* Public exam guides */",
    );

    expect(stagedJourney).toMatch(
      /\.tmua-starting-path ol\s*\{[^}]*grid-template-columns:\s*repeat\(4,/su,
    );
    expect(css).toMatch(
      /@media \(max-width: 62rem\)[\s\S]*?\.tmua-starting-path ol\s*\{[^}]*repeat\(2,/u,
    );
    expect(css).toMatch(
      /@media \(max-width: 35rem\)[\s\S]*?\.tmua-starting-path ol\s*\{[^}]*grid-template-columns:\s*1fr/u,
    );
    expect(stagedJourney).toMatch(
      /\.tmua-overview-page__actions\s*\{[^}]*flex-wrap:\s*wrap/su,
    );
    expect(stagedJourney).not.toContain("linear-gradient");
  });
});
