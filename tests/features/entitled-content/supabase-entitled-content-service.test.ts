import type { SupabaseClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  TMUA_SIX_WEEK_PLAN_RESOURCE_ID,
  TMUA_SPECIMEN_P1_EXPLANATIONS_RESOURCE_ID,
} from "../../../src/features/entitled-content/domain.js";
import { SupabaseEntitledContentService } from "../../../src/features/entitled-content/supabase-entitled-content-service.js";

async function canonicalPayload(): Promise<unknown> {
  return JSON.parse(await readFile("content/notes/tmua/six-week-review-plan-v1.json", "utf8"));
}

function client(options: { readonly authenticated: boolean; readonly rows?: unknown[] }): SupabaseClient {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: options.authenticated ? { id: "student" } : null },
        error: null,
      })),
    },
    rpc: vi.fn(async () => ({ data: options.rows ?? [], error: null })),
  } as unknown as SupabaseClient;
}

describe("Supabase entitled content delivery", () => {
  it("does not call the protected RPC for an anonymous visitor", async () => {
    const supabase = client({ authenticated: false });
    const service = new SupabaseEntitledContentService(supabase);

    await expect(service.load(TMUA_SIX_WEEK_PLAN_RESOURCE_ID)).resolves.toEqual({ status: "unauthenticated" });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("distinguishes a signed-in account without entitlement from a server error", async () => {
    const service = new SupabaseEntitledContentService(client({ authenticated: true, rows: [] }));
    await expect(service.load(TMUA_SIX_WEEK_PLAN_RESOURCE_ID)).resolves.toEqual({ status: "locked" });
  });

  it("validates and returns the server-delivered structured product", async () => {
    const payload = await canonicalPayload();
    const supabase = client({
      authenticated: true,
      rows: [{
        id: TMUA_SIX_WEEK_PLAN_RESOURCE_ID,
        title: "TMUA 六周精确训练计划",
        revision: 1,
        metadata: { delivery: "server-structured-native-page" },
        source_sha256: "9c1430c1fa10ebe313483b367a65f0516381924528a76638107c2f48298fc438",
        payload,
      }],
    });
    const service = new SupabaseEntitledContentService(supabase);

    const result = await service.load(TMUA_SIX_WEEK_PLAN_RESOURCE_ID);
    expect(result.status).toBe("available");
    if (result.status === "available") {
      expect(result.resource.payload.id).toBe(TMUA_SIX_WEEK_PLAN_RESOURCE_ID);
      if (result.resource.payload.id === TMUA_SIX_WEEK_PLAN_RESOURCE_ID) {
        expect(result.resource.payload.weeklyPlan).toHaveLength(6);
      }
    }
    expect(supabase.rpc).toHaveBeenCalledWith("get_entitled_content_resource", {
      p_resource_id: TMUA_SIX_WEEK_PLAN_RESOURCE_ID,
    });
  });

  it("validates the server-delivered 20-question worked review product", async () => {
    const payload = JSON.parse(
      await readFile("content/notes/tmua/specimen-p1-worked-explanations-v1.json", "utf8"),
    ) as unknown;
    const service = new SupabaseEntitledContentService(client({
      authenticated: true,
      rows: [{
        id: TMUA_SPECIMEN_P1_EXPLANATIONS_RESOURCE_ID,
        title: "TMUA Early Specimen Paper 1 逐题深度解析",
        revision: 1,
        metadata: { delivery: "server-structured-native-page" },
        source_sha256: "25b776e6951dcf79cc7657fc1865df4547fbef5a737fb81eb28ee7e0e4b4233e",
        payload,
      }],
    }));

    const result = await service.load(TMUA_SPECIMEN_P1_EXPLANATIONS_RESOURCE_ID);
    expect(result.status).toBe("available");
    if (
      result.status === "available" &&
      result.resource.payload.id === TMUA_SPECIMEN_P1_EXPLANATIONS_RESOURCE_ID
    ) {
      expect(result.resource.payload.explanations).toHaveLength(20);
    }
  });
});
