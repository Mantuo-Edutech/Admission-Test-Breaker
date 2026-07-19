import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("content review operations responsive contract", () => {
  it("moves the queue from three columns to two and then one without hiding evidence", async () => {
    const css = await readFile("src/styles/practice.css", "utf8");
    const routes = await readFile("src/app/routes.tsx", "utf8");

    expect(css).toContain("grid-template-columns: 4rem minmax(0, 1fr) minmax(16rem, 0.36fr)");
    expect(css).toContain(".content-review-operations-queue article { grid-template-columns: 3.5rem minmax(0, 1fr); }");
    expect(css).toContain(".content-review-operations-queue article { grid-template-columns: 1fr; }");
    expect(css).toContain(".content-review-operations-metrics { grid-template-columns: repeat(2, 1fr); }");
    expect(css).toContain(".content-review-operations-metrics { grid-template-columns: 1fr; }");
    expect(routes).toContain('path: "/operations/content-review"');
  });
});
