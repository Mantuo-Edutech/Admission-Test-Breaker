import type { ActorRef } from "../learning-space/domain.js";
import {
  asAIRunId,
  asGrantId,
  asLearnerSpaceId,
  asProjectionRef,
  asUserId,
  type AIRunId,
  type GrantId,
  type LearnerSpaceId,
  type ProjectionRef,
} from "../shared/ids.js";

export type AIJobPurpose =
  | "session_review"
  | "longitudinal_review"
  | "teacher_assist";

export interface AIJobBudget {
  maxInputTokens: number;
  maxOutputTokens: number;
  maxCostMinor: number;
}

export interface AIJob {
  id: AIRunId;
  purpose: AIJobPurpose;
  learnerSpaceId: LearnerSpaceId;
  requestedBy: ActorRef;
  grantId?: GrantId;
  inputProjectionRefs: readonly ProjectionRef[];
  policyVersion: string;
  budget: AIJobBudget;
}

export interface AIJobValidationIssue {
  code:
    | "unsupported_field"
    | "invalid_id"
    | "invalid_purpose"
    | "invalid_requester"
    | "delegated_grant_required"
    | "projection_required"
    | "invalid_projection_ref"
    | "policy_version_required"
    | "invalid_token_budget"
    | "invalid_cost_budget";
  path: string;
  message: string;
}

const topLevelFields = new Set([
  "id",
  "purpose",
  "learnerSpaceId",
  "requestedBy",
  "grantId",
  "inputProjectionRefs",
  "policyVersion",
  "budget",
]);

const budgetFields = new Set([
  "maxInputTokens",
  "maxOutputTokens",
  "maxCostMinor",
]);

function issue(
  code: AIJobValidationIssue["code"],
  path: string,
  message: string,
): AIJobValidationIssue {
  return { code, path, message };
}

function hasOnlySupportedFields(
  value: object,
  allowed: ReadonlySet<string>,
  prefix = "",
): AIJobValidationIssue[] {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) =>
      issue(
        "unsupported_field",
        `${prefix}${key}`,
        `${prefix}${key} is not part of the public AI job contract`,
      ),
    );
}

function validateId(
  path: string,
  validator: () => unknown,
): AIJobValidationIssue[] {
  try {
    validator();
    return [];
  } catch (error) {
    return [
      issue(
        "invalid_id",
        path,
        error instanceof Error ? error.message : `${path} is invalid`,
      ),
    ];
  }
}

function validateRequester(actor: ActorRef): AIJobValidationIssue[] {
  if (actor.kind === "guest") {
    return [
      issue(
        "invalid_requester",
        "requestedBy",
        "A Guest actor cannot request a server AI job",
      ),
    ];
  }

  try {
    if ("userId" in actor) {
      asUserId(actor.userId);
    } else if (
      typeof actor.actorId !== "string" ||
      actor.actorId.trim().length === 0
    ) {
      throw new Error("actorId must be non-empty");
    }
    return [];
  } catch (error) {
    return [
      issue(
        "invalid_requester",
        "requestedBy",
        error instanceof Error ? error.message : "requester is invalid",
      ),
    ];
  }
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export function validateAIJob(job: AIJob): readonly AIJobValidationIssue[] {
  const issues: AIJobValidationIssue[] = [
    ...hasOnlySupportedFields(job, topLevelFields),
    ...validateId("id", () => asAIRunId(job.id)),
    ...validateId("learnerSpaceId", () =>
      asLearnerSpaceId(job.learnerSpaceId),
    ),
    ...validateRequester(job.requestedBy),
  ];

  if (
    job.purpose !== "session_review" &&
    job.purpose !== "longitudinal_review" &&
    job.purpose !== "teacher_assist"
  ) {
    issues.push(issue("invalid_purpose", "purpose", "AI job purpose is not supported"));
  }

  if (job.grantId !== undefined) {
    issues.push(...validateId("grantId", () => asGrantId(job.grantId!)));
  }

  if (job.requestedBy.kind !== "student" && job.grantId === undefined) {
    issues.push(
      issue(
        "delegated_grant_required",
        "grantId",
        "A non-student requester must cite the learner grant used",
      ),
    );
  }

  if (
    !Array.isArray(job.inputProjectionRefs) ||
    job.inputProjectionRefs.length === 0
  ) {
    issues.push(
      issue(
        "projection_required",
        "inputProjectionRefs",
        "At least one approved projection reference is required",
      ),
    );
  } else {
    job.inputProjectionRefs.forEach((projectionRef, index) => {
      try {
        asProjectionRef(projectionRef);
      } catch (error) {
        issues.push(
          issue(
            "invalid_projection_ref",
            `inputProjectionRefs.${index}`,
            error instanceof Error ? error.message : "Projection reference is invalid",
          ),
        );
      }
    });
  }

  if (
    typeof job.policyVersion !== "string" ||
    job.policyVersion.trim().length === 0
  ) {
    issues.push(
      issue(
        "policy_version_required",
        "policyVersion",
        "A versioned AI policy is required",
      ),
    );
  }

  issues.push(...hasOnlySupportedFields(job.budget, budgetFields, "budget."));

  if (!isPositiveInteger(job.budget.maxInputTokens)) {
    issues.push(
      issue(
        "invalid_token_budget",
        "budget.maxInputTokens",
        "maxInputTokens must be a positive integer",
      ),
    );
  }
  if (!isPositiveInteger(job.budget.maxOutputTokens)) {
    issues.push(
      issue(
        "invalid_token_budget",
        "budget.maxOutputTokens",
        "maxOutputTokens must be a positive integer",
      ),
    );
  }
  if (
    !Number.isInteger(job.budget.maxCostMinor) ||
    job.budget.maxCostMinor < 0
  ) {
    issues.push(
      issue(
        "invalid_cost_budget",
        "budget.maxCostMinor",
        "maxCostMinor must be a non-negative integer",
      ),
    );
  }

  return issues;
}
