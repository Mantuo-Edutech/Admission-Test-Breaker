import { readFile } from "node:fs/promises";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MathContent } from "../../src/features/practice/components/MathContent.js";

describe("shared online-question typography and density contract", () => {
  it("uses shared density tokens and removes paragraph margins from choice rows", async () => {
    const [tokens, css] = await Promise.all([
      readFile("src/styles/tokens.css", "utf8"),
      readFile("src/styles/practice.css", "utf8"),
    ]);

    expect(tokens).toContain("--font-exam-serif:");
    expect(tokens).toContain("--practice-option-min-height: 3.2rem");
    expect(tokens).toContain("--practice-option-marker-size: 1.9rem");
    expect(css).toMatch(/\.answer-choice__content\s+\.math-content p\s*\{[^}]*margin:\s*0;/su);
    expect(css).toMatch(/\.question-card\s*\{[^}]*padding:\s*var\(--practice-card-padding\);/su);
    expect(css).not.toContain("min-height: 39rem");
  });

  it("renders scalar answer values with the exam number face instead of a second math weight", () => {
    const { container } = render(<MathContent blocks={[{
      kind: "paragraph",
      runs: [{ kind: "math", tex: "8000" }],
    }]} />);

    expect(screen.getByText("8000")).toHaveClass("math-plain-number");
    expect(container.querySelector(".katex")).toBeNull();
  });
});
