import {
  isLearnerSpaceOwner,
  type LearnerSpace,
} from "../learner-space/domain.js";
import type { ActorRef } from "../learning-space/domain.js";
import type {
  GrantId,
  LearnerSpaceId,
  PracticeSessionId,
  UserId,
} from "../shared/ids.js";

export type GrantScope =
  | "progress:read"
  | "responses:read"
  | "annotations:write"
  | "plans:write"
  | "assignments:write"
  | "ai-insights:read"
  | "ai-insights:run"
  | "data:export"
  | "integration:operate";

export type GrantResource =
  | { kind: "learner-space" }
  | { kind: "practice-session"; id: PracticeSessionId };

export interface Grant {
  id: GrantId;
  learnerSpaceId: LearnerSpaceId;
  grantedByUserId: UserId;
  subject: ActorRef;
  scopes: readonly GrantScope[];
  resource: GrantResource;
  startsAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface AccessRequest {
  learnerSpace: LearnerSpace;
  actor: ActorRef;
  scope: GrantScope;
  resource: GrantResource;
  at: string;
}

export type AccessDenialReason =
  | "no_matching_grant"
  | "scope_not_granted"
  | "resource_not_granted"
  | "grant_revoked"
  | "grant_not_active";

export type AccessDecision =
  | {
      allowed: true;
      basis: "owner";
      reason: "learner_space_owner";
    }
  | {
      allowed: true;
      basis: "grant";
      grantId: GrantId;
      reason: "active_grant";
    }
  | {
      allowed: false;
      basis: "denied";
      reason: AccessDenialReason;
    };

function actorMatches(left: ActorRef, right: ActorRef): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  if (
    (left.kind === "student" ||
      left.kind === "teacher" ||
      left.kind === "parent") &&
    (right.kind === "student" ||
      right.kind === "teacher" ||
      right.kind === "parent")
  ) {
    return left.userId === right.userId;
  }

  if (
    (left.kind === "agent" || left.kind === "system") &&
    (right.kind === "agent" || right.kind === "system")
  ) {
    return left.actorId === right.actorId;
  }

  return false;
}

function resourceMatches(grant: GrantResource, requested: GrantResource): boolean {
  if (grant.kind === "learner-space") {
    return true;
  }

  return (
    requested.kind === "practice-session" && grant.id === requested.id
  );
}

function denial(reason: AccessDenialReason): AccessDecision {
  return { allowed: false, basis: "denied", reason };
}

export function decideAccess(
  request: AccessRequest,
  grants: readonly Grant[],
): AccessDecision {
  if (request.actor.kind === "guest") {
    return denial("no_matching_grant");
  }

  if (
    request.actor.kind === "student" &&
    isLearnerSpaceOwner(request.learnerSpace, request.actor.userId)
  ) {
    return {
      allowed: true,
      basis: "owner",
      reason: "learner_space_owner",
    };
  }

  const subjectGrants = grants.filter(
    (grant) =>
      grant.learnerSpaceId === request.learnerSpace.id &&
      actorMatches(grant.subject, request.actor),
  );
  if (subjectGrants.length === 0) {
    return denial("no_matching_grant");
  }

  const scopedGrants = subjectGrants.filter((grant) =>
    grant.scopes.includes(request.scope),
  );
  if (scopedGrants.length === 0) {
    return denial("scope_not_granted");
  }

  const resourceGrants = scopedGrants.filter((grant) =>
    resourceMatches(grant.resource, request.resource),
  );
  if (resourceGrants.length === 0) {
    return denial("resource_not_granted");
  }

  const unrevokedGrants = resourceGrants.filter(
    (grant) => grant.revokedAt === undefined || request.at < grant.revokedAt,
  );
  if (unrevokedGrants.length === 0) {
    return denial("grant_revoked");
  }

  const activeGrant = unrevokedGrants.find(
    (grant) => grant.startsAt <= request.at && request.at < grant.expiresAt,
  );
  if (activeGrant === undefined) {
    return denial("grant_not_active");
  }

  return {
    allowed: true,
    basis: "grant",
    grantId: activeGrant.id,
    reason: "active_grant",
  };
}
