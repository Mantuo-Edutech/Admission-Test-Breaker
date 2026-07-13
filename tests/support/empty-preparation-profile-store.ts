import type { GuestSpaceId } from "../../src/platform/shared/ids.js";
import type { PreparationProfile } from "../../src/features/preparation-profile/domain.js";
import type {
  PreparationProfileLoadResult,
  PreparationProfileStore,
} from "../../src/features/preparation-profile/storage/store.js";

export const EMPTY_PREPARATION_PROFILE_STORE: PreparationProfileStore = {
  async load(_guestSpaceId: GuestSpaceId): Promise<PreparationProfileLoadResult> {
    return { profile: null, issue: null };
  },
  async save(_profile: PreparationProfile): Promise<{ persisted: boolean }> {
    return { persisted: true };
  },
  async clear(_guestSpaceId: GuestSpaceId): Promise<void> {},
};
