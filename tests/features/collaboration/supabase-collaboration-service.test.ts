import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseCollaborationService } from "../../../src/features/collaboration/supabase-collaboration-service.js";

describe("Supabase student collaboration service", () => {
  it("issues an exact-scope invite and parses the one-time code", async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        invite_id: "civ_11111111111111111111111111111111",
        code: "MTSHARE-ABCDEF0123456789ABCDEF01",
        invite_expires_at: "2026-07-26T00:00:00.000Z",
      }],
      error: null,
    }));
    const service = new SupabaseCollaborationService({ rpc } as unknown as SupabaseClient);

    await expect(service.issueInvite({
      subjectKind: "teacher",
      scopes: ["progress:read", "plans:write"],
      examIds: ["tmua", "esat"],
      grantDays: 30,
    })).resolves.toEqual({
      id: "civ_11111111111111111111111111111111",
      code: "MTSHARE-ABCDEF0123456789ABCDEF01",
      inviteExpiresAt: "2026-07-26T00:00:00.000Z",
    });
    expect(rpc).toHaveBeenCalledWith("issue_my_collaboration_invite", {
      p_subject_kind: "teacher",
      p_scopes: ["progress:read", "plans:write"],
      p_exam_ids: ["tmua", "esat"],
      p_grant_days: 30,
    });
  });

  it("returns only sanitized progress facts through the progress RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        session_id: "ses_shared_1",
        paper_id: "tmua-diagnostic-v1",
        status: "submitted",
        started_at: "2026-07-19T08:00:00.000Z",
        submitted_at: "2026-07-19T08:20:00.000Z",
        answered_count: 8,
        active_ms: 900000,
        answer_changes: 2,
        last_activity_at: "2026-07-19T08:20:00.000Z",
      }],
      error: null,
    }));
    const service = new SupabaseCollaborationService({ rpc } as unknown as SupabaseClient);

    await expect(service.getSharedProgress("grt_abc", "tmua")).resolves.toEqual({
      grantId: "grt_abc",
      examId: "tmua",
      sessions: [{
        sessionId: "ses_shared_1",
        paperId: "tmua-diagnostic-v1",
        status: "submitted",
        startedAt: "2026-07-19T08:00:00.000Z",
        submittedAt: "2026-07-19T08:20:00.000Z",
        answeredCount: 8,
        activeMs: 900000,
        answerChanges: 2,
        lastActivityAt: "2026-07-19T08:20:00.000Z",
      }],
    });
    expect(rpc).toHaveBeenCalledWith("get_shared_learning_progress", {
      p_grant_id: "grt_abc",
      p_exam_id: "tmua",
    });
  });

  it("uses a separate responses RPC and validates every returned answer", async () => {
    const valid = new SupabaseCollaborationService({
      rpc: vi.fn(async () => ({
        data: [{
          session_id: "ses_shared_1",
          paper_id: "tmua-diagnostic-v1",
          status: "submitted",
          started_at: "2026-07-19T08:00:00.000Z",
          submitted_at: "2026-07-19T08:20:00.000Z",
          answers: { "tmua-diagnostic-v1-q01": "A" },
          timing_by_question_ms: { "tmua-diagnostic-v1-q01": 45000 },
        }],
        error: null,
      })),
    } as unknown as SupabaseClient);
    await expect(valid.listSharedResponses("grt_abc", "tmua")).resolves.toHaveLength(1);

    const malformed = new SupabaseCollaborationService({
      rpc: vi.fn(async () => ({
        data: [{
          session_id: "ses_shared_1",
          paper_id: "tmua-diagnostic-v1",
          status: "submitted",
          started_at: "2026-07-19T08:00:00.000Z",
          submitted_at: null,
          answers: { "tmua-diagnostic-v1-q01": { leaked: true } },
          timing_by_question_ms: {},
        }],
        error: null,
      })),
    } as unknown as SupabaseClient);
    await expect(malformed.listSharedResponses("grt_abc", "tmua")).rejects.toThrow(
      "协作授权数据格式无法验证",
    );
  });

  it("fails closed when a grant is absent, expired or revoked", async () => {
    const service = new SupabaseCollaborationService({
      rpc: vi.fn(async () => ({
        data: null,
        error: { code: "42501", message: "collaboration_grant_required" },
      })),
    } as unknown as SupabaseClient);
    await expect(service.getSharedProgress("grt_denied", "tmua")).rejects.toThrow(
      "当前账号没有这项权限，或授权已经撤销、过期",
    );
  });

  it("creates each teaching artifact through the grant-scoped RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        artifact_id: "car_11111111111111111111111111111111",
        grant_id: "grt_abc",
        kind: "assignment",
        exam_id: "tmua",
        title: "本周练习",
        body: "完成 TMUA 起点诊断并记录错因。",
        due_at: "2026-07-26T00:00:00.000Z",
        author_reference: "usr_11111111111111111111111111111111",
        created_at: "2026-07-19T00:00:00.000Z",
      }],
      error: null,
    }));
    const service = new SupabaseCollaborationService({ rpc } as unknown as SupabaseClient);
    await expect(service.createArtifact({
      grantId: "grt_abc",
      kind: "assignment",
      examId: "tmua",
      title: " 本周练习 ",
      body: " 完成 TMUA 起点诊断并记录错因。 ",
      dueAt: "2026-07-26T00:00:00.000Z",
    })).resolves.toMatchObject({ kind: "assignment", examId: "tmua" });
    expect(rpc).toHaveBeenCalledWith("create_collaboration_artifact", {
      p_grant_id: "grt_abc",
      p_kind: "assignment",
      p_exam_id: "tmua",
      p_title: "本周练习",
      p_body: "完成 TMUA 起点诊断并记录错因。",
      p_due_at: "2026-07-26T00:00:00.000Z",
    });
  });
});
