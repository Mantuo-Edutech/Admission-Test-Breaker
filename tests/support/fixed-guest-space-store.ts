import { createGuestSpace } from "../../src/platform/learning-space/domain.js";
import type { GuestSpaceStore } from "../../src/features/guest-space/storage/store.js";

export const FIXED_GUEST_SPACE = createGuestSpace({
  id: "gsp_tmua-hub-test",
  ownerActorId: "guest_tmua-hub-test",
  createdAt: "2026-07-13T08:00:00.000Z",
});

export const FIXED_GUEST_SPACE_STORE: GuestSpaceStore = {
  async loadOrCreate() {
    return FIXED_GUEST_SPACE;
  },
};
