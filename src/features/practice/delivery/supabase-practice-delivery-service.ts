import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseDeliveredPracticePaper,
  parsePracticeResults,
  type DeliveredPracticePaper,
  type PracticeDeliveryService,
} from "./domain.js";
import type { PracticeResults } from "../domain/results.js";
import type { PracticeSession } from "../domain/session.js";

export class SupabasePracticeDeliveryService implements PracticeDeliveryService {
  readonly configured = true;

  constructor(private readonly client: SupabaseClient) {}

  async loadPaper(paperId: string, paperRevisionId?: string): Promise<DeliveredPracticePaper | null> {
    const { data, error } = await this.client.rpc("get_practice_paper", {
      p_paper_id: paperId,
      p_paper_revision_id: paperRevisionId ?? null,
    });
    if (error !== null) {
      if (/practice_paper_not_found/iu.test(error.message)) return null;
      throw new Error("暂时无法读取这套试卷，请稍后重试");
    }
    return parseDeliveredPracticePaper(data, paperId);
  }

  async score(session: PracticeSession): Promise<PracticeResults> {
    const { data, error } = await this.client.rpc("score_practice_submission", {
      p_submission: session,
    });
    if (error !== null) throw new Error("暂时无法生成本次基础结果，请稍后重试");
    return parsePracticeResults(data, session);
  }
}
