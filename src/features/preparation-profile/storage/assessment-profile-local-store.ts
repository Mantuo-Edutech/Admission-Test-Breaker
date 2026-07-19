import type { GuestSpaceId } from "../../../platform/shared/ids.js";
import {
  createAssessmentBackgroundProfile,
  type AssessmentBackgroundProfile,
  type AssessmentPreparationExperience,
  type AssessmentProfileExamId,
  type AssessmentCurriculumId,
  type AssessmentLearningStage,
  type AssessmentSubjectArea,
  type AssessmentWeeklyTime,
} from "../assessment-profile-domain.js";
import type { AssessmentProfileLoadResult, AssessmentProfileStore } from "./assessment-profile-store.js";

const rootFields = new Set([
  "schemaVersion", "guestSpaceId", "examId", "entryCycle", "curriculumId",
  "learningStage", "subjectAreas", "experience", "weeklyTime", "createdAt", "updatedAt",
]);

class UnsupportedAssessmentProfileError extends Error {}

function storageKey(guestSpaceId: GuestSpaceId, examId: AssessmentProfileExamId): string {
  return `admission-breaker:assessment-profile:${guestSpaceId}:${examId}:v1`;
}

function corruptKeyPrefix(guestSpaceId: GuestSpaceId, examId: AssessmentProfileExamId): string {
  return `admission-breaker:assessment-profile:${guestSpaceId}:${examId}:corrupt:`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a non-empty string`);
  return value;
}

export function parseStoredAssessmentProfile(value: unknown): AssessmentBackgroundProfile {
  if (!isRecord(value)) throw new Error("Assessment profile must be an object");
  if (value.schemaVersion !== 1) throw new UnsupportedAssessmentProfileError("Assessment profile schema is unsupported");
  if (Object.keys(value).length !== rootFields.size || Object.keys(value).some((key) => !rootFields.has(key))) {
    throw new Error("Assessment profile fields are invalid");
  }
  if (!Array.isArray(value.subjectAreas)) throw new Error("Assessment profile subjectAreas must be an array");
  const subjectAreas = value.subjectAreas.map((subject, index) =>
    requiredString(subject, `Assessment profile subject ${index}`) as AssessmentSubjectArea,
  );
  return createAssessmentBackgroundProfile({
    guestSpaceId: requiredString(value.guestSpaceId, "Assessment profile guestSpaceId"),
    examId: requiredString(value.examId, "Assessment profile examId") as AssessmentProfileExamId,
    entryCycle: requiredString(value.entryCycle, "Assessment profile entryCycle") as "2027" | "2028",
    curriculumId: requiredString(value.curriculumId, "Assessment profile curriculumId") as AssessmentCurriculumId,
    learningStage: requiredString(value.learningStage, "Assessment profile learningStage") as AssessmentLearningStage,
    subjectAreas,
    experience: requiredString(value.experience, "Assessment profile experience") as AssessmentPreparationExperience,
    weeklyTime: requiredString(value.weeklyTime, "Assessment profile weeklyTime") as AssessmentWeeklyTime,
    createdAt: requiredString(value.createdAt, "Assessment profile createdAt"),
    updatedAt: requiredString(value.updatedAt, "Assessment profile updatedAt"),
  });
}

export class LocalAssessmentProfileStore implements AssessmentProfileStore {
  private readonly memory = new Map<string, AssessmentBackgroundProfile>();

  constructor(private readonly storage: Storage, private readonly now: () => Date = () => new Date()) {}

  async load(guestSpaceId: GuestSpaceId, examId: AssessmentProfileExamId): Promise<AssessmentProfileLoadResult> {
    const key = storageKey(guestSpaceId, examId);
    let raw: string | null;
    try { raw = this.storage.getItem(key); } catch { return { profile: this.memory.get(key) ?? null, issue: null }; }
    if (raw === null) return { profile: this.memory.get(key) ?? null, issue: null };
    try {
      const profile = parseStoredAssessmentProfile(JSON.parse(raw) as unknown);
      if (profile.guestSpaceId !== guestSpaceId || profile.examId !== examId) throw new Error("Assessment profile crossed its storage boundary");
      this.memory.set(key, profile);
      return { profile, issue: null };
    } catch (error) {
      this.memory.delete(key);
      try {
        this.storage.setItem(`${corruptKeyPrefix(guestSpaceId, examId)}${this.now().toISOString().replace(/[:.]/g, "-")}`, raw);
        this.storage.removeItem(key);
      } catch { /* Classification remains even if quarantine storage is unavailable. */ }
      return { profile: null, issue: error instanceof UnsupportedAssessmentProfileError ? "unsupported" : "corrupt" };
    }
  }

  async save(profile: AssessmentBackgroundProfile): Promise<{ persisted: boolean }> {
    const normalized = parseStoredAssessmentProfile(JSON.parse(JSON.stringify(profile)) as unknown);
    const key = storageKey(normalized.guestSpaceId, normalized.examId);
    this.memory.set(key, normalized);
    try {
      this.storage.setItem(key, JSON.stringify(normalized));
      return { persisted: true };
    } catch { return { persisted: false }; }
  }

  async clear(guestSpaceId: GuestSpaceId, examId: AssessmentProfileExamId): Promise<void> {
    const key = storageKey(guestSpaceId, examId);
    this.memory.delete(key);
    try { this.storage.removeItem(key); } catch { /* Memory remains cleared. */ }
  }
}
