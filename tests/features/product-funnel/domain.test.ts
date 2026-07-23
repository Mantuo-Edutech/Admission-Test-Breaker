import { describe, expect, it } from "vitest";
import {
  PRODUCT_FUNNEL_EVENT_TYPES,
  assertProductFunnelEventInput,
  funnelExamFromPackageIds,
} from "../../../src/features/product-funnel/domain.js";

describe("privacy-safe product funnel domain", () => {
  it("allows only the six deliberately selected conversion actions", () => {
    expect(PRODUCT_FUNNEL_EVENT_TYPES).toEqual([
      "exam_selected",
      "profile_completed",
      "practice_started",
      "practice_completed",
      "bingbing_opened",
      "invite_redeemed",
    ]);
  });

  it("rejects arbitrary context that could carry URLs or personal data", () => {
    expect(() => assertProductFunnelEventInput({
      eventType: "bingbing_opened",
      examId: "tmua",
      contextCode: "email=student@example.com",
    })).toThrow("product_funnel_context_invalid");
  });

  it("resolves an invite to exactly one exam without storing its code", () => {
    expect(funnelExamFromPackageIds(["tmua-full-access", "tmua-deep-review"])).toBe("tmua");
    expect(funnelExamFromPackageIds(["tmua-full-access", "esat-deep-review"])).toBeNull();
    expect(funnelExamFromPackageIds([])).toBeNull();
  });
});
