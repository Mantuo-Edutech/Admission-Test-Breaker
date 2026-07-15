import { createPreparationProfile } from "../../src/features/preparation-profile/domain.js";
import type { PreparationProfileStore } from "../../src/features/preparation-profile/storage/store.js";

export const FIXED_PREPARATION_PROFILE_STORE: PreparationProfileStore = {
  async load(guestSpaceId) {
    return {
      profile: createPreparationProfile({
        guestSpaceId,
        exam: "TMUA",
        entryCycle: "2027",
        curriculumSystem: "caie",
        selections: [
          { qualificationId: "caie-9709-2026-2027", unitIds: ["p1"] },
        ],
        experience: "sampled",
        createdAt: "2026-07-13T08:00:00.000Z",
        updatedAt: "2026-07-13T08:00:00.000Z",
      }),
      issue: null,
    };
  },
  async save() {
    return { persisted: true };
  },
  async clear() {},
};
