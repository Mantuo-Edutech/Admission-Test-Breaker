import { describe, expect, it } from "vitest";
import {
  decideAccess,
  type AccessDenialReason,
  type AccessRequest,
  type Grant,
} from "../../../src/platform/consent/domain.js";
import { createLearnerSpace } from "../../../src/platform/learner-space/domain.js";

const learnerSpace = createLearnerSpace({
  id: "lsp_student-one",
  ownerUserId: "usr_student-one",
  createdAt: "2026-07-13T08:00:00.000Z",
});

const baseRequest: AccessRequest = {
  learnerSpace,
  actor: { kind: "teacher", userId: "usr_teacher-one" },
  scope: "responses:read",
  resource: { kind: "practice-session", id: "ses_tmua-one" },
  at: "2026-07-13T09:00:00.000Z",
};

const baseGrant: Grant = {
  id: "grt_teacher-responses",
  learnerSpaceId: "lsp_student-one",
  grantedByUserId: "usr_student-one",
  subject: { kind: "teacher", userId: "usr_teacher-one" },
  scopes: ["responses:read"],
  resource: { kind: "practice-session", id: "ses_tmua-one" },
  startsAt: "2026-07-13T08:30:00.000Z",
  expiresAt: "2026-07-20T08:30:00.000Z",
};

interface DenialCase {
  name: string;
  request: AccessRequest;
  grants: readonly Grant[];
  reason: AccessDenialReason;
}

const denialCases: DenialCase[] = [
  {
    name: "a role with no grant",
    request: baseRequest,
    grants: [],
    reason: "no_matching_grant",
  },
  {
    name: "the wrong learner space",
    request: baseRequest,
    grants: [{ ...baseGrant, learnerSpaceId: "lsp_someone-else" }],
    reason: "no_matching_grant",
  },
  {
    name: "a missing scope",
    request: baseRequest,
    grants: [{ ...baseGrant, scopes: ["progress:read"] }],
    reason: "scope_not_granted",
  },
  {
    name: "the wrong subject",
    request: baseRequest,
    grants: [
      {
        ...baseGrant,
        subject: { kind: "teacher", userId: "usr_teacher-two" },
      },
    ],
    reason: "no_matching_grant",
  },
  {
    name: "a grant that has not started",
    request: baseRequest,
    grants: [{ ...baseGrant, startsAt: "2026-07-14T08:30:00.000Z" }],
    reason: "grant_not_active",
  },
  {
    name: "a grant at its exclusive expiry boundary",
    request: {
      ...baseRequest,
      at: "2026-07-20T08:30:00.000Z",
    },
    grants: [baseGrant],
    reason: "grant_not_active",
  },
  {
    name: "a revoked grant",
    request: baseRequest,
    grants: [{ ...baseGrant, revokedAt: "2026-07-13T08:59:00.000Z" }],
    reason: "grant_revoked",
  },
  {
    name: "the wrong session resource",
    request: baseRequest,
    grants: [
      {
        ...baseGrant,
        resource: {
          kind: "practice-session",
          id: "ses_tmua-two",
        },
      },
    ],
    reason: "resource_not_granted",
  },
];

describe("granular learner grants", () => {
  it("allows the student owner explicitly without pretending a role grants access", () => {
    const decision = decideAccess(
      {
        ...baseRequest,
        actor: { kind: "student", userId: "usr_student-one" },
        scope: "data:export",
      },
      [],
    );

    expect(decision).toEqual({
      allowed: true,
      basis: "owner",
      reason: "learner_space_owner",
    });
  });

  it("allows an exact active grant and returns its audit basis", () => {
    expect(decideAccess(baseRequest, [baseGrant])).toEqual({
      allowed: true,
      basis: "grant",
      grantId: "grt_teacher-responses",
      reason: "active_grant",
    });
  });

  it("lets a learner-space grant cover resources inside that learner space", () => {
    const grant: Grant = {
      ...baseGrant,
      resource: { kind: "learner-space" },
    };

    expect(decideAccess(baseRequest, [grant]).allowed).toBe(true);
  });

  it.each(denialCases)("denies $name", ({ request, grants, reason }) => {
    expect(decideAccess(request, grants)).toEqual({
      allowed: false,
      basis: "denied",
      reason,
    });
  });

  it("matches agent identities without converting them into users", () => {
    const request: AccessRequest = {
      ...baseRequest,
      actor: { kind: "agent", actorId: "openclaw:student-helper" },
      scope: "integration:operate",
    };
    const grant: Grant = {
      ...baseGrant,
      id: "grt_agent-operate",
      subject: { kind: "agent", actorId: "openclaw:student-helper" },
      scopes: ["integration:operate"],
    };

    expect(decideAccess(request, [grant]).allowed).toBe(true);
  });
});
