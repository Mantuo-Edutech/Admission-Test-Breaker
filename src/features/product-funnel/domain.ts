export const PRODUCT_FUNNEL_EVENT_TYPES = [
  "exam_selected",
  "profile_completed",
  "practice_started",
  "practice_completed",
  "bingbing_opened",
  "invite_redeemed",
] as const;

export const PRODUCT_FUNNEL_EXAM_IDS = ["tmua", "esat", "tara", "lnat", "ucat"] as const;

export type ProductFunnelEventType = (typeof PRODUCT_FUNNEL_EVENT_TYPES)[number];
export type ProductFunnelExamId = (typeof PRODUCT_FUNNEL_EXAM_IDS)[number];

export interface ProductFunnelEventInput {
  readonly eventType: ProductFunnelEventType;
  readonly examId: ProductFunnelExamId;
  /** A controlled product/action label, never a URL, email, answer or free-form value. */
  readonly contextCode: string;
}

export interface ProductFunnelEvent extends ProductFunnelEventInput {
  readonly schemaVersion: 1;
  readonly id: `fun_${string}`;
  readonly journeyId: `journey_${string}`;
  readonly occurredAt: string;
}

export interface ProductFunnelSink {
  append(event: ProductFunnelEvent): Promise<void>;
}

export interface ProductFunnelTracker {
  track(input: ProductFunnelEventInput): Promise<void>;
}

const CONTEXT_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/u;

export function assertProductFunnelEventInput(
  input: ProductFunnelEventInput,
): ProductFunnelEventInput {
  if (!(PRODUCT_FUNNEL_EVENT_TYPES as readonly string[]).includes(input.eventType)) {
    throw new Error("product_funnel_event_type_invalid");
  }
  if (!(PRODUCT_FUNNEL_EXAM_IDS as readonly string[]).includes(input.examId)) {
    throw new Error("product_funnel_exam_invalid");
  }
  if (!CONTEXT_CODE_PATTERN.test(input.contextCode)) {
    throw new Error("product_funnel_context_invalid");
  }
  return input;
}

export function funnelExamFromPackageIds(
  packageIds: readonly string[],
): ProductFunnelExamId | null {
  const exams = new Set<ProductFunnelExamId>();
  for (const packageId of packageIds) {
    const examId = PRODUCT_FUNNEL_EXAM_IDS.find((candidate) =>
      packageId.startsWith(`${candidate}-`),
    );
    if (examId !== undefined) exams.add(examId);
  }
  return exams.size === 1 ? [...exams][0]! : null;
}
