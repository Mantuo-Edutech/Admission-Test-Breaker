import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseEntitledContentPayload,
  type EntitledContentResult,
  type EntitledContentService,
} from "./domain.js";

interface ResourceRow {
  id?: unknown;
  title?: unknown;
  revision?: unknown;
  metadata?: unknown;
  source_sha256?: unknown;
  payload?: unknown;
}

function parseRow(value: unknown): ResourceRow {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("资料服务返回了无法识别的数据");
  }
  return value as ResourceRow;
}

export class SupabaseEntitledContentService implements EntitledContentService {
  readonly configured = true;

  constructor(private readonly client: SupabaseClient) {}

  async load(resourceId: string): Promise<EntitledContentResult> {
    const { data: authData, error: authError } = await this.client.auth.getUser();
    if (authError !== null || authData.user === null) return { status: "unauthenticated" };

    const { data, error } = await this.client.rpc("get_entitled_content_resource", {
      p_resource_id: resourceId,
    });
    if (error !== null) throw new Error("暂时无法读取这份资料，请稍后重试");
    const first = Array.isArray(data) ? data[0] : null;
    if (first === null || first === undefined) return { status: "locked" };

    const row = parseRow(first);
    if (
      row.id !== resourceId ||
      typeof row.title !== "string" || row.title.length === 0 ||
      !Number.isInteger(row.revision) || (row.revision as number) <= 0 ||
      row.metadata === null || typeof row.metadata !== "object" || Array.isArray(row.metadata) ||
      typeof row.source_sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(row.source_sha256)
    ) {
      throw new Error("资料版本信息不完整，请联系满托处理");
    }
    return {
      status: "available",
      resource: {
        id: resourceId,
        title: row.title,
        revision: row.revision as number,
        metadata: row.metadata as Readonly<Record<string, unknown>>,
        sourceSha256: row.source_sha256,
        payload: parseEntitledContentPayload(resourceId, row.payload),
      },
    };
  }
}
