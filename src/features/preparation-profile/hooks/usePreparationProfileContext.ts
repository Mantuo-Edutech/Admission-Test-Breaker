import { useEffect, useState } from "react";
import type { AppServices } from "../../../app/dependencies.js";
import type { GuestSpace } from "../../../platform/learning-space/domain.js";
import type { PreparationProfile } from "../domain.js";

export interface PreparationProfileContextState {
  readonly loading: boolean;
  readonly guestSpace: GuestSpace | null;
  readonly profile: PreparationProfile | null;
  readonly issue: "corrupt" | "unsupported" | null;
  replaceProfile(profile: PreparationProfile): void;
}

export function usePreparationProfileContext(
  services: AppServices,
): PreparationProfileContextState {
  const [loading, setLoading] = useState(true);
  const [guestSpace, setGuestSpace] = useState<GuestSpace | null>(null);
  const [profile, setProfile] = useState<PreparationProfile | null>(null);
  const [issue, setIssue] = useState<"corrupt" | "unsupported" | null>(null);

  useEffect(() => {
    let active = true;
    void services.guestSpaceStore.loadOrCreate().then(async (loadedGuestSpace) => {
      const loadedProfile = await services.profileStore.load(loadedGuestSpace.id);
      if (!active) return;
      setGuestSpace(loadedGuestSpace);
      setProfile(loadedProfile.profile);
      setIssue(loadedProfile.issue);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [services.guestSpaceStore, services.profileStore]);

  return {
    loading,
    guestSpace,
    profile,
    issue,
    replaceProfile: setProfile,
  };
}
