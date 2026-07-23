import type { GuestSpaceId } from "../../../platform/shared/ids.js";
import {
  createAssessmentBackgroundProfile,
  type AssessmentBackgroundProfile,
  type AssessmentBackgroundProfileV2,
  type AssessmentCourseId,
  type AssessmentPreparationExperience,
  type AssessmentProfileExamId,
  type AssessmentCurriculumId,
  type AssessmentLearningStage,
  type AssessmentSubjectArea,
  type AssessmentWeeklyTime,
} from "../assessment-profile-domain.js";
import type { AssessmentProfileLoadResult, AssessmentProfileStore } from "./assessment-profile-store.js";

const legacyRootFields = new Set([
  "schemaVersion", "guestSpaceId", "examId", "entryCycle", "curriculumId",
  "learningStage", "subjectAreas", "experience", "weeklyTime", "createdAt", "updatedAt",
]);
const currentRootFields = new Set([...legacyRootFields, "courseIds"]);

class UnsupportedAssessmentProfileError extends Error {}

function storageKey(guestSpaceId: GuestSpaceId, examId: AssessmentProfileExamId): string {
  return `admission-breaker:assessment-profile:${guestSpaceId}:${examId}:v2`;
}

function legacyStorageKey(guestSpaceId: GuestSpaceId, examId: AssessmentProfileExamId): string {
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

export function parseStoredAssessmentProfile(value: unknown): AssessmentBackgroundProfileV2 {
  if (!isRecord(value)) throw new Error("Assessment profile must be an object");
  if (value.schemaVersion !== 1 && value.schemaVersion !== 2) throw new UnsupportedAssessmentProfileError("Assessment profile schema is unsupported");
  const expectedFields = value.schemaVersion === 1 ? legacyRootFields : currentRootFields;
  if (Object.keys(value).length !== expectedFields.size || Object.keys(value).some((key) => !expectedFields.has(key))) {
    throw new Error("Assessment profile fields are invalid");
  }
  if (!Array.isArray(value.subjectAreas)) throw new Error("Assessment profile subjectAreas must be an array");
  const subjectAreas = value.subjectAreas.map((subject, index) =>
    requiredString(subject, `Assessment profile subject ${index}`) as AssessmentSubjectArea,
  );
  const courseIds = value.schemaVersion === 2
    ? (() => {
        if (!Array.isArray(value.courseIds)) throw new Error("Assessment profile courseIds must be an array");
        return value.courseIds.map((course, index) =>
          requiredString(course, `Assessment profile course ${index}`) as AssessmentCourseId,
        );
      })()
    : undefined;
  return createAssessmentBackgroundProfile({
    guestSpaceId: requiredString(value.guestSpaceId, "Assessment profile guestSpaceId"),
    examId: requiredString(value.examId, "Assessment profile examId") as AssessmentProfileExamId,
    entryCycle: requiredString(value.entryCycle, "Assessment profile entryCycle") as "2027" | "2028",
    curriculumId: requiredString(value.curriculumId, "Assessment profile curriculumId") as AssessmentCurriculumId,
    learningStage: requiredString(value.learningStage, "Assessment profile learningStage") as AssessmentLearningStage,
    subjectAreas,
    ...(courseIds === undefined ? {} : { courseIds }),
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
    const legacyKey = legacyStorageKey(guestSpaceId, examId);
    let raw: string | null;
    try { raw = this.storage.getItem(key); } catch { return { profile: this.memory.get(key) ?? null, issue: null }; }
    let sourceKey = key;
    if (raw === null) {
      try { raw = this.storage.getItem(legacyKey); } catch { return { profile: this.memory.get(key) ?? null, issue: null }; }
      sourceKey = legacyKey;
    }
    if (raw === null) return { profile: this.memory.get(key) ?? null, issue: null };
    try {
      const profile = parseStoredAssessmentProfile(JSON.parse(raw) as unknown);
      if (profile.guestSpaceId !== guestSpaceId || profile.examId !== examId) throw new Error("Assessment profile crossed its storage boundary");
      this.memory.set(key, profile);
      if (sourceKey === legacyKey) {
        try {
          this.storage.setItem(key, JSON.stringify(profile));
          this.storage.removeItem(legacyKey);
        } catch { /* The migrated profile remains available in memory. */ }
      }
      return { profile, issue: null };
    } catch (error) {
      this.memory.delete(key);
      try {
        this.storage.setItem(`${corruptKeyPrefix(guestSpaceId, examId)}${this.now().toISOString().replace(/[:.]/g, "-")}`, raw);
        this.storage.removeItem(sourceKey);
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
    try {
      this.storage.removeItem(key);
      this.storage.removeItem(legacyStorageKey(guestSpaceId, examId));
    } catch { /* Memory remains cleared. */ }
  }
}
