import type { GuestSpace } from "../../../platform/learning-space/domain.js";

export interface GuestSpaceStore {
  loadOrCreate(): Promise<GuestSpace>;
}
