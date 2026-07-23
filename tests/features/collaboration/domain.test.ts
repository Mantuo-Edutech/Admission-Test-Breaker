import { describe, expect, it } from "vitest";
import {
  hasCollaborationInviteErrors,
  scopeForArtifact,
  validateCollaborationInvite,
} from "../../../src/features/collaboration/domain.js";

describe("student-controlled collaboration domain", () => {
  it("accepts individually selected scopes, exams and a bounded duration", () => {
    const errors = validateCollaborationInvite({
      subjectKind: "teacher",
      scopes: ["progress:read", "plans:write"],
      examIds: ["tmua", "esat"],
      grantDays: 30,
    });
    expect(hasCollaborationInviteErrors(errors)).toBe(false);
  });

  it("rejects empty authority and unbounded grants", () => {
    expect(validateCollaborationInvite({
      subjectKind: "parent",
      scopes: [],
      examIds: [],
      grantDays: 365,
    })).toEqual({
      scopes: "请至少选择一项明确权限",
      examIds: "请至少选择一项考试",
      grantDays: "授权有效期必须为 1–180 天",
    });
  });

  it("maps every collaborative write to its own scope", () => {
    expect(scopeForArtifact("annotation")).toBe("annotations:write");
    expect(scopeForArtifact("plan")).toBe("plans:write");
    expect(scopeForArtifact("assignment")).toBe("assignments:write");
  });
});
