import { describe, expect, it } from "vitest";
import {
  validateAIJob,
  type AIJob,
} from "../../../src/platform/ai-gateway/domain.js";

const validJob: AIJob = {
  id: "air_session-review-one",
  purpose: "session_review",
  learnerSpaceId: "lsp_student-one",
  requestedBy: { kind: "student", userId: "usr_student-one" },
  inputProjectionRefs: ["projection:session:ses_tmua-one:v1"],
  policyVersion: "session-review@1",
  budget: {
    maxInputTokens: 12_000,
    maxOutputTokens: 2_000,
    maxCostMinor: 800,
  },
};

describe("provider-neutral AI job contract", () => {
  it("accepts a student job that references projections and an explicit budget", () => {
    expect(validateAIJob(validJob)).toEqual([]);
  });

  it("requires at least one versioned projection reference", () => {
    expect(
      validateAIJob({ ...validJob, inputProjectionRefs: [] }),
    ).toContainEqual(
      expect.objectContaining({ code: "projection_required" }),
    );
  });

  it.each([
    ["maxInputTokens", 0],
    ["maxInputTokens", 1.5],
    ["maxOutputTokens", -1],
    ["maxOutputTokens", Number.NaN],
  ] as const)("requires a positive integer %s", (field, value) => {
    const issues = validateAIJob({
      ...validJob,
      budget: { ...validJob.budget, [field]: value },
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "invalid_token_budget", path: `budget.${field}` }),
    );
  });

  it.each([-1, 1.5, Number.NaN])(
    "rejects invalid minor-unit cost budget %s",
    (maxCostMinor) => {
      const issues = validateAIJob({
        ...validJob,
        budget: { ...validJob.budget, maxCostMinor },
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ code: "invalid_cost_budget" }),
      );
    },
  );

  it("requires a nonblank policy version", () => {
    expect(validateAIJob({ ...validJob, policyVersion: "  " })).toContainEqual(
      expect.objectContaining({ code: "policy_version_required" }),
    );
  });

  it("requires delegated requesters to cite the learner grant", () => {
    const job: AIJob = {
      ...validJob,
      requestedBy: { kind: "teacher", userId: "usr_teacher-one" },
    };

    expect(validateAIJob(job)).toContainEqual(
      expect.objectContaining({ code: "delegated_grant_required" }),
    );
    expect(
      validateAIJob({ ...job, grantId: "grt_teacher-ai-run" }),
    ).not.toContainEqual(
      expect.objectContaining({ code: "delegated_grant_required" }),
    );
  });

  it("rejects a Guest requester even when a grant ID is supplied", () => {
    expect(
      validateAIJob({
        ...validJob,
        requestedBy: { kind: "guest", actorId: "guest_browser-one" },
        grantId: "grt_guest-not-allowed",
      }),
    ).toContainEqual(
      expect.objectContaining({
        code: "invalid_requester",
        path: "requestedBy",
      }),
    );
  });

  it("rejects raw prompts, provider choices, and secrets in the public job", () => {
    const unsafeJob = {
      ...validJob,
      rawPrompt: "all private history",
      provider: "some-provider",
      providerApiKey: "secret",
    } as AIJob;

    expect(validateAIJob(unsafeJob)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unsupported_field", path: "rawPrompt" }),
        expect.objectContaining({ code: "unsupported_field", path: "provider" }),
        expect.objectContaining({ code: "unsupported_field", path: "providerApiKey" }),
      ]),
    );
  });
});
