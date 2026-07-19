import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  buildFeedbackHref,
  feedbackReference,
  normalizeFeedbackContext,
} from "../../../src/features/feedback/domain.js";
import { SupabaseFeedbackService } from "../../../src/features/feedback/supabase-feedback-service.js";

describe("student feedback domain", () => {
  it("keeps only allow-listed context values in a feedback link", () => {
    const context = normalizeFeedbackContext({
      exam: "tmua",
      route: "/practice/tmua-specimen-p1?secret=value",
      resource: "TMUA-SPECIMEN-P1",
      question: "TMUA-SPECIMEN-P1-Q01",
    });

    expect(context).toEqual({
      examId: "tmua",
      route: "/feedback",
      resourceId: "tmua-specimen-p1",
      questionId: "tmua-specimen-p1-q01",
    });
    expect(buildFeedbackHref(context)).toBe(
      "/feedback?exam=tmua&from=%2Ffeedback&resource=tmua-specimen-p1&question=tmua-specimen-p1-q01",
    );
  });

  it("creates a short student-readable reference without exposing sequential IDs", () => {
    expect(feedbackReference("12345678-abcd-4abc-8abc-1234567890ab")).toBe("FB-12345678");
  });
});

describe("Supabase feedback service", () => {
  it("submits validated context through the RPC and parses its receipt", async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        feedback_id: "12345678-abcd-4abc-8abc-1234567890ab",
        priority: "P2",
        status: "new",
        created_at: "2026-07-18T10:00:00.000Z",
      }],
      error: null,
    }));
    const client = { rpc } as unknown as SupabaseClient;
    const service = new SupabaseFeedbackService(client);

    await expect(service.submit({
      category: "content_error",
      examId: "tmua",
      route: "/practice/tmua-specimen-p1",
      resourceId: "tmua-specimen-p1",
      questionId: "tmua-specimen-p1-q01",
      message: "This option is missing a minus sign.",
    })).resolves.toEqual({
      id: "12345678-abcd-4abc-8abc-1234567890ab",
      priority: "P2",
      status: "new",
      createdAt: "2026-07-18T10:00:00.000Z",
    });
    expect(rpc).toHaveBeenCalledWith("submit_student_feedback", {
      p_category: "content_error",
      p_exam_id: "tmua",
      p_route: "/practice/tmua-specimen-p1",
      p_resource_id: "tmua-specimen-p1",
      p_question_id: "tmua-specimen-p1-q01",
      p_message: "This option is missing a minus sign.",
    });
  });

  it("maps privacy-preserving database validation to actionable student copy", async () => {
    const client = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: "feedback_message_contains_contact_details", code: "22023" },
      })),
    } as unknown as SupabaseClient;

    await expect(new SupabaseFeedbackService(client).submit({
      category: "technical_problem",
      route: "/practice/tmua-specimen-p1",
      message: "Please contact me on my phone number.",
    })).rejects.toThrow("请不要填写邮箱、手机号");
  });

  it("parses only the current student's RLS-filtered ticket list", async () => {
    const limit = vi.fn(async () => ({
      data: [{
        id: "12345678-abcd-4abc-8abc-1234567890ab",
        category: "content_error",
        priority: "P2",
        exam_id: "tmua",
        route: "/practice/tmua-specimen-p1",
        resource_id: "tmua-specimen-p1",
        question_id: "tmua-specimen-p1-q01",
        message: "This option is missing a minus sign.",
        status: "triaged",
        created_at: "2026-07-18T10:00:00.000Z",
        updated_at: "2026-07-18T11:00:00.000Z",
        resolved_at: null,
      }],
      error: null,
    }));
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    const service = new SupabaseFeedbackService({ from } as unknown as SupabaseClient);

    const rows = await service.listMine();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "12345678-abcd-4abc-8abc-1234567890ab",
      questionId: "tmua-specimen-p1-q01",
      status: "triaged",
    });
    expect(from).toHaveBeenCalledWith("student_feedback");
  });
});
