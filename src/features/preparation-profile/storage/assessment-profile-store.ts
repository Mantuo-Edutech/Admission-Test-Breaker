import type { GuestSpaceId } from "../../../platform/shared/ids.js";
import type {
  AssessmentBackgroundProfile,
  AssessmentProfileExamId,
} from "../assessment-profile-domain.js";

export interface AssessmentProfileLoadResult {
  readonly profile: AssessmentBackgroundProfile | null;
  readonly issue: "corrupt" | "unsupported" | "unavailable" | null;
}

export interface AssessmentProfileStore {
  load(guestSpaceId: GuestSpaceId, examId: AssessmentProfileExamId): Promise<AssessmentProfileLoadResult>;
  save(profile: AssessmentBackgroundProfile): Promise<{ persisted: boolean; durable?: boolean; issue?: "unavailable" }>;
  clear(guestSpaceId: GuestSpaceId, examId: AssessmentProfileExamId): Promise<void>;
}
