import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("student collaboration responsive layout contract", () => {
  it("keeps the five independent permissions legible across computer, iPad and phone", async () => {
    const css = await readFile("src/styles/practice.css", "utf8");

    expect(css).toMatch(/\.collaboration-scope-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*1fr\)/su);
    expect(css).toMatch(/@media\s*\(max-width:\s*65rem\)[\s\S]*?\.collaboration-scope-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*1fr\)/u);
    expect(css).toMatch(/@media\s*\(max-width:\s*47\.5rem\)[\s\S]*?\.collaboration-scope-grid[^}]*grid-template-columns:\s*1fr/u);
    expect(css).toMatch(/\.shared-progress__metrics\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*1fr\)/su);
    expect(css).toMatch(/@media\s*\(max-width:\s*47\.5rem\)[\s\S]*?\.shared-progress__metrics\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*1fr\)/u);
  });

  it("exposes separate student, redemption and collaborator routes", async () => {
    const routes = await readFile("src/app/routes.tsx", "utf8");

    for (const path of [
      "/account/sharing",
      "/collaboration/redeem",
      "/collaboration",
      "/collaboration/:grantId",
    ]) {
      expect(routes).toContain(`path: \"${path}\"`);
    }
  });
});
