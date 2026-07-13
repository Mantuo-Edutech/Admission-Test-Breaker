import { describe, expect, it } from "vitest";
import {
  createGuestSpace,
  isGuestSpaceOwner,
} from "../../../src/platform/learning-space/domain.js";

describe("local guest space", () => {
  it("creates an unclaimed local space owned by one guest actor", () => {
    const space = createGuestSpace({
      id: "gsp_browser-one",
      ownerActorId: "guest_browser-one",
      createdAt: "2026-07-14T00:00:00.000Z",
    });

    expect(space).toEqual({
      id: "gsp_browser-one",
      ownerActorId: "guest_browser-one",
      status: "unclaimed",
      createdAt: "2026-07-14T00:00:00.000Z",
    });
    expect(
      isGuestSpaceOwner(space, {
        kind: "guest",
        actorId: "guest_browser-one",
      }),
    ).toBe(true);
    expect(
      isGuestSpaceOwner(space, { kind: "guest", actorId: "guest_other" }),
    ).toBe(false);
  });

  it("rejects learner-space and guest-space IDs used in the wrong domain", () => {
    expect(() =>
      createGuestSpace({
        id: "lsp_wrong",
        ownerActorId: "guest_browser-one",
        createdAt: "2026-07-14T00:00:00.000Z",
      }),
    ).toThrow(/gsp_/);
  });
});
