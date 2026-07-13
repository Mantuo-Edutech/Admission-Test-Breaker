import { describe, expect, it } from "vitest";
import {
  createLearnerSpace,
  isLearnerSpaceOwner,
} from "../../../src/platform/learner-space/domain.js";

describe("learner space domain", () => {
  it("creates an active learner-owned space from canonical values", () => {
    const space = createLearnerSpace({
      id: "lsp_demo-student",
      ownerUserId: "usr_demo-student",
      createdAt: "2026-07-13T08:00:00.000Z",
    });

    expect(space).toEqual({
      id: "lsp_demo-student",
      ownerUserId: "usr_demo-student",
      status: "active",
      createdAt: "2026-07-13T08:00:00.000Z",
    });
    expect(isLearnerSpaceOwner(space, "usr_demo-student")).toBe(true);
    expect(isLearnerSpaceOwner(space, "usr_another-student")).toBe(false);
  });

  it.each([
    ["learner space ID", { id: "", ownerUserId: "usr_owner" }],
    ["learner space ID", { id: "space_owner", ownerUserId: "usr_owner" }],
    ["owner user ID", { id: "lsp_owner", ownerUserId: "" }],
    ["owner user ID", { id: "lsp_owner", ownerUserId: "owner" }],
  ])("rejects an invalid %s", (_label, invalidIds) => {
    expect(() =>
      createLearnerSpace({
        ...invalidIds,
        createdAt: "2026-07-13T08:00:00.000Z",
      }),
    ).toThrow();
  });

  it.each(["2026-07-13", "not-a-date", "2026-07-13T08:00:00+08:00"])(
    "rejects non-canonical UTC creation time %s",
    (createdAt) => {
      expect(() =>
        createLearnerSpace({
          id: "lsp_owner",
          ownerUserId: "usr_owner",
          createdAt,
        }),
      ).toThrow(/UTC timestamp/);
    },
  );

  it("does not allow a new learner space to start archived", () => {
    expect(() =>
      createLearnerSpace({
        id: "lsp_owner",
        ownerUserId: "usr_owner",
        status: "archived",
        createdAt: "2026-07-13T08:00:00.000Z",
      }),
    ).toThrow(/active/);
  });
});
