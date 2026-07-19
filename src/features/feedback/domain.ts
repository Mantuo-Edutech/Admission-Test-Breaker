export const FEEDBACK_CATEGORIES = [
  "content_error",
  "technical_problem",
  "account_access",
  "privacy_security",
  "feature_request",
  "other",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export type FeedbackPriority = "P1" | "P2" | "P3" | "P4";
export type FeedbackStatus = "new" | "triaged" | "in_progress" | "resolved" | "closed";
export type FeedbackExamId = "tmua" | "esat" | "tara" | "lnat" | "ucat";

export interface FeedbackContext {
  readonly examId?: FeedbackExamId;
  readonly route: string;
  readonly resourceId?: string;
  readonly questionId?: string;
}

export interface SubmitFeedbackInput extends FeedbackContext {
  readonly category: FeedbackCategory;
  readonly message: string;
}

export interface StudentFeedbackReceipt {
  readonly id: string;
  readonly priority: FeedbackPriority;
  readonly status: FeedbackStatus;
  readonly createdAt: string;
}

export interface StudentFeedbackRecord extends StudentFeedbackReceipt {
  readonly category: FeedbackCategory;
  readonly examId?: FeedbackExamId;
  readonly route: string;
  readonly resourceId?: string;
  readonly questionId?: string;
  readonly message: string;
  readonly updatedAt: string;
  readonly resolvedAt?: string;
}

export interface FeedbackService {
  readonly configured: boolean;
  submit(input: SubmitFeedbackInput): Promise<StudentFeedbackReceipt>;
  listMine(): Promise<readonly StudentFeedbackRecord[]>;
}

const safeSlug = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u;
const safeRoute = /^\/[A-Za-z0-9_./-]*$/u;

export function isFeedbackExamId(value: string | null): value is FeedbackExamId {
  return value === "tmua" || value === "esat" || value === "tara" || value === "lnat" || value === "ucat";
}

export function normalizeFeedbackContext(input: {
  readonly exam?: string | null;
  readonly route?: string | null;
  readonly resource?: string | null;
  readonly question?: string | null;
}): FeedbackContext {
  const route = input.route !== null
    && input.route !== undefined
    && input.route.length <= 320
    && safeRoute.test(input.route)
    ? input.route
    : "/feedback";
  const resourceId = input.resource?.toLowerCase();
  const questionId = input.question?.toLowerCase();
  const examCandidate = input.exam ?? null;
  const examId = isFeedbackExamId(examCandidate) ? examCandidate : undefined;
  return {
    route,
    ...(examId === undefined ? {} : { examId }),
    ...(resourceId !== undefined && resourceId.length <= 160 && safeSlug.test(resourceId)
      ? { resourceId }
      : {}),
    ...(questionId !== undefined && questionId.length <= 160 && safeSlug.test(questionId)
      ? { questionId }
      : {}),
  };
}

export function buildFeedbackHref(context: FeedbackContext): string {
  const params = new URLSearchParams();
  if (context.examId !== undefined) params.set("exam", context.examId);
  params.set("from", context.route);
  if (context.resourceId !== undefined) params.set("resource", context.resourceId);
  if (context.questionId !== undefined) params.set("question", context.questionId);
  return `/feedback?${params.toString()}`;
}

export function feedbackReference(id: string): string {
  return `FB-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}
