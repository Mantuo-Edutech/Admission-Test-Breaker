import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("UCAT specialist response layout contract", () => {
  it("keeps statement controls and partial-credit results readable on narrow screens", async () => {
    const css = await readFile("src/styles/practice.css", "utf8");

    expect(css).toMatch(/\.statement-response-list\s+fieldset\s*\{[^}]*grid-template-columns:/su);
    expect(css).toMatch(/\.statement-response-list\s+label:focus-within\s*\{/su);
    expect(css).toMatch(/@media\s*\(max-width:\s*37rem\)[\s\S]*?\.statement-response-list\s+fieldset\s*\{[^}]*grid-template-columns:\s*1fr;/su);
    expect(css).toMatch(/\.result-row--partial\s+\.result-row__status\s*>\s*span\s*\{/su);
  });
});
