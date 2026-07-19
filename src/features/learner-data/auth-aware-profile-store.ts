import type { GuestSpaceId } from "../../platform/shared/ids.js";
import { createPreparationProfile, type PreparationProfile } from "../preparation-profile/domain.js";
import type {
  PreparationProfileLoadResult,
  PreparationProfileStore,
} from "../preparation-profile/storage/store.js";
import type { LearnerDataRepository } from "./repository.js";

function rebindForDevice(
  profile: PreparationProfile,
  guestSpaceId: GuestSpaceId,
): PreparationProfile {
  if (profile.guestSpaceId === guestSpaceId) return profile;
  return createPreparationProfile({
    guestSpaceId,
    exam: profile.exam,
    entryCycle: profile.entryCycle,
    curriculumSystem: profile.curriculumSystem,
    selections: profile.selections,
    experience: profile.experience,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  });
}

export class AuthAwarePreparationProfileStore implements PreparationProfileStore {
  private transientProfile: PreparationProfile | null = null;

  constructor(
    private readonly localStore: PreparationProfileStore,
    private readonly repository: LearnerDataRepository,
  ) {}

  async load(guestSpaceId: GuestSpaceId): Promise<PreparationProfileLoadResult> {
    let context;
    try {
      context = await this.repository.currentContext();
    } catch {
      return this.localStore.load(guestSpaceId);
    }
    if (context === null) return this.localStore.load(guestSpaceId);

    const local = await this.localStore.load(guestSpaceId);
    try {
      const cloud = await this.repository.loadPreparationProfile();
      if (
        local.profile !== null &&
        (cloud === null || Date.parse(local.profile.updatedAt) > Date.parse(cloud.updatedAt))
      ) {
        const claimed = await this.repository.savePreparationProfile(local.profile);
        await this.localStore.clear(guestSpaceId);
        this.transientProfile = rebindForDevice(claimed, guestSpaceId);
        return { profile: this.transientProfile, issue: null };
      }
      if (cloud !== null) {
        await this.localStore.clear(guestSpaceId);
        this.transientProfile = rebindForDevice(cloud, guestSpaceId);
        return { profile: this.transientProfile, issue: null };
      }
      return { profile: this.transientProfile, issue: local.issue };
    } catch {
      this.transientProfile = local.profile ?? this.transientProfile;
      return { profile: this.transientProfile, issue: local.issue };
    }
  }

  async save(profile: PreparationProfile): Promise<{
    persisted: boolean;
    durable?: boolean;
    issue?: "unavailable";
  }> {
    let context;
    try {
      context = await this.repository.currentContext();
    } catch {
      this.transientProfile = profile;
      return { persisted: false, durable: false, issue: "unavailable" };
    }
    if (context === null) return this.localStore.save(profile);

    try {
      this.transientProfile = await this.repository.savePreparationProfile(profile);
      await this.localStore.clear(profile.guestSpaceId);
      return { persisted: true, durable: true };
    } catch {
      this.transientProfile = profile;
      return { persisted: false, durable: false, issue: "unavailable" };
    }
  }

  async clear(guestSpaceId: GuestSpaceId): Promise<void> {
    let context = null;
    try {
      context = await this.repository.currentContext();
    } catch {
      // Local data can still be cleared when the network is unavailable.
    }
    if (context !== null) await this.repository.deletePreparationProfile();
    this.transientProfile = null;
    await this.localStore.clear(guestSpaceId);
  }
}
