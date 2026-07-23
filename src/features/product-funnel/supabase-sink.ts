import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductFunnelEvent, ProductFunnelSink } from "./domain.js";

export class SupabaseProductFunnelSink implements ProductFunnelSink {
  constructor(private readonly client: SupabaseClient) {}

  async append(event: ProductFunnelEvent): Promise<void> {
    const { error } = await this.client.rpc("record_product_funnel_event", {
      p_event_id: event.id,
      p_journey_id: event.journeyId,
      p_event_type: event.eventType,
      p_exam_id: event.examId,
      p_context_code: event.contextCode,
      p_occurred_at: event.occurredAt,
    });
    if (error !== null) throw new Error(error.message);
  }
}
