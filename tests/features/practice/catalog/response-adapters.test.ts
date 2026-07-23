import { describe, expect, it } from "vitest";
import {
  PRACTICE_RESPONSE_ADAPTERS,
  getPracticeResponseAdapter,
} from "../../../../src/features/practice/catalog/response-adapters.js";

describe("exam response adapters", () => {
  it("defines one adapter for every configured response mode", () => {
    expect(Object.keys(PRACTICE_RESPONSE_ADAPTERS).sort()).toEqual([
      "data-choice",
      "essay",
      "mixed-choice",
      "partial-credit-choice",
      "passage-choice",
      "single-choice",
    ]);
  });

  it("keeps single, multiple and essay responses in the shared session format", () => {
    expect(getPracticeResponseAdapter("single-choice").serialise("b")).toBe("B");
    expect(getPracticeResponseAdapter("mixed-choice").serialise(["C", "A", "C"])).toBe("multi:A|C");
    expect(getPracticeResponseAdapter("essay").serialise("  A reasoned argument.  ")).toBe("A reasoned argument.");
  });

  it("does not claim that an LNAT essay can be scored as an objective question", () => {
    expect(getPracticeResponseAdapter("essay")).toMatchObject({
      renderer: "essay",
      immediatelyScored: false,
    });
  });
});
