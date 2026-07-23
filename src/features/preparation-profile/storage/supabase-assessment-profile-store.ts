import {
  isAuthSessionMissingError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { GuestSpaceId } from "../../../platform/shared/ids.js";
import {
  createAssessmentBackgroundProfile,
  type AssessmentBackgroundProfile,
  type AssessmentProfileExamId,
} from "../assessment-profile-domain.js";
import { parseStoredAssessmentProfile } from "./assessment-profile-local-store.js";
import type { AssessmentProfileLoadResult, AssessmentProfileStore } from "./assessment-profile-store.js";

interface AssessmentProfileRow { profile: unknown }

function rebindProfile(profile: AssessmentBackgroundProfile, guestSpaceId: GuestSpaceId): AssessmentBackgroundProfile {
  if (profile.guestSpaceId === guestSpaceId) return profile;
  return createAssessmentBackgroundProfile({
    guestSpaceId,
    examId: profile.examId,
    entryCycle: profile.entryCycle,
    curriculumId: profile.curriculumId,
    learningStage: profile.learningStage,
    subjectAreas: profile.subjectAreas,
    ...(profile.schemaVersion === 2 ? { courseIds: profile.courseIds } : {}),
    experience: profile.experience,
    weeklyTime: profile.weeklyTime,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  });
}

export class SupabaseAssessmentProfileStore implements AssessmentProfileStore {
  private transient = new Map<AssessmentProfileExamId, AssessmentBackgroundProfile>();

  constructor(private readonly local: AssessmentProfileStore, private readonly client: SupabaseClient) {}

  private async authenticated(): Promise<boolean> {
    const { data, error } = await this.client.auth.getUser();
    if (error !== null) {
      if (isAuthSessionMissingError(error)) return false;
      throw error;
    }
    return data.user !== null;
  }

  private async saveRemote(profile: AssessmentBackgroundProfile): Promise<AssessmentBackgroundProfile> {
    const { data, error } = await this.client.rpc("save_assessment_background_profile", { p_profile: profile });
    if (error !== null) throw error;
    return parseStoredAssessmentProfile(data);
  }

  async load(guestSpaceId: GuestSpaceId, examId: AssessmentProfileExamId): Promise<AssessmentProfileLoadResult> {
    let isAuthenticated: boolean;
    try { isAuthenticated = await this.authenticated(); } catch {
      const local = await this.local.load(guestSpaceId, examId);
      return {
        profile: local.profile ?? this.transient.get(examId) ?? null,
        issue: "unavailable",
      };
    }
    if (!isAuthenticated) return this.local.load(guestSpaceId, examId);

    const local = await this.local.load(guestSpaceId, examId);
    try {
      const { data, error } = await this.client
        .from("assessment_background_profiles")
        .select("profile")
        .eq("exam_id", examId)
        .maybeSingle();
      if (error !== null) throw error;
      const cloud = data === null ? null : parseStoredAssessmentProfile((data as AssessmentProfileRow).profile);
      if (local.profile !== null && (cloud === null || Date.parse(local.profile.updatedAt) > Date.parse(cloud.updatedAt))) {
        const claimed = rebindProfile(await this.saveRemote(local.profile), guestSpaceId);
        await this.local.clear(guestSpaceId, examId);
        this.transient.set(examId, claimed);
        return { profile: claimed, issue: null };
      }
      if (cloud !== null) {
        const rebound = rebindProfile(cloud, guestSpaceId);
        await this.local.clear(guestSpaceId, examId);
        this.transient.set(examId, rebound);
        return { profile: rebound, issue: null };
      }
      return { profile: this.transient.get(examId) ?? null, issue: local.issue };
    } catch {
      const fallback = local.profile ?? this.transient.get(examId) ?? null;
      return { profile: fallback, issue: fallback === null ? "unavailable" : local.issue };
    }
  }

  async save(profile: AssessmentBackgroundProfile): Promise<{ persisted: boolean; durable?: boolean; issue?: "unavailable" }> {
    let isAuthenticated: boolean;
    try { isAuthenticated = await this.authenticated(); } catch {
      this.transient.set(profile.examId, profile);
      return { persisted: false, durable: false, issue: "unavailable" };
    }
    if (!isAuthenticated) return this.local.save(profile);
    try {
      const saved = rebindProfile(await this.saveRemote(profile), profile.guestSpaceId);
      this.transient.set(profile.examId, saved);
      await this.local.clear(profile.guestSpaceId, profile.examId);
      return { persisted: true, durable: true };
    } catch {
      this.transient.set(profile.examId, profile);
      return { persisted: false, durable: false, issue: "unavailable" };
    }
  }

  async clear(guestSpaceId: GuestSpaceId, examId: AssessmentProfileExamId): Promise<void> {
    try {
      if (await this.authenticated()) {
        const { error } = await this.client.rpc("delete_assessment_background_profile", { p_exam_id: examId });
        if (error !== null) throw error;
      }
    } finally {
      this.transient.delete(examId);
      await this.local.clear(guestSpaceId, examId);
    }
  }
}
