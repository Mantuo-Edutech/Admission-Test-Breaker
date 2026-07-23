import type { SupabaseClient } from "@supabase/supabase-js";
import type { PracticeSession } from "../practice/domain/session.js";
import type { PreparationProfile } from "../preparation-profile/domain.js";

export interface AuthenticatedLearnerContext {
  readonly authUserId: string;
  readonly platformUserId: string;
  readonly learnerSpaceId: string;
}

export interface LearnerDataRepository {
  currentContext(): Promise<AuthenticatedLearnerContext | null>;
  loadPreparationProfile(): Promise<PreparationProfile | null>;
  savePreparationProfile(profile: PreparationProfile): Promise<PreparationProfile>;
  deletePreparationProfile(): Promise<void>;
  loadCurrentPracticeSession(): Promise<PracticeSession | null>;
  listPracticeSessions(limit: number): Promise<readonly PracticeSession[]>;
  savePracticeSession(session: PracticeSession): Promise<PracticeSession>;
}

export interface LearnerDataRepositoryFactory {
  (client: SupabaseClient): LearnerDataRepository;
}

export class LearnerDataUnavailableError extends Error {
  constructor(message = "学习数据暂时无法同步") {
    super(message);
    this.name = "LearnerDataUnavailableError";
  }
}
