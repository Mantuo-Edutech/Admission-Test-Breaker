import type { GuestSpaceId } from "../../../platform/shared/ids.js";
import type { PreparationProfile } from "../domain.js";

export interface PreparationProfileLoadResult {
  profile: PreparationProfile | null;
  issue: "corrupt" | "unsupported" | null;
}

export interface PreparationProfileStore {
  load(guestSpaceId: GuestSpaceId): Promise<PreparationProfileLoadResult>;
  save(profile: PreparationProfile): Promise<{ persisted: boolean }>;
  clear(guestSpaceId: GuestSpaceId): Promise<void>;
}
