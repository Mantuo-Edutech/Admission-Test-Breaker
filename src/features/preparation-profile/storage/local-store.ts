import type { GuestSpaceId } from "../../../platform/shared/ids.js";
import {
  createPreparationProfile,
  type PreparationProfile,
  type PreparationExperience,
  type QualificationSelection,
} from "../domain.js";
import type {
  PreparationProfileLoadResult,
  PreparationProfileStore,
} from "./store.js";

const rootFields = new Set([
  "schemaVersion",
  "guestSpaceId",
  "exam",
  "entryCycle",
  "curriculumSystem",
  "selections",
  "experience",
  "createdAt",
  "updatedAt",
]);
const selectionFields = new Set(["qualificationId", "unitIds"]);

class UnsupportedProfileError extends Error {}

function storageKey(guestSpaceId: GuestSpaceId): string {
  return `admission-breaker:preparation-profile:${guestSpaceId}:v1`;
}

function corruptKeyPrefix(guestSpaceId: GuestSpaceId): string {
  return `admission-breaker:preparation-profile:${guestSpaceId}:corrupt:`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactFields(
  value: Record<string, unknown>,
  fields: ReadonlySet<string>,
  label: string,
): void {
  for (const key of Object.keys(value)) {
    if (!fields.has(key)) throw new Error(`${label} contains unsupported field ${key}`);
  }
  for (const key of fields) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new Error(`${label} is missing field ${key}`);
    }
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function parseSelections(value: unknown): QualificationSelection[] {
  if (!Array.isArray(value)) throw new Error("Profile selections must be an array");
  return value.map((selection, index) => {
    if (!isRecord(selection)) throw new Error(`Profile selection ${index} must be an object`);
    assertExactFields(selection, selectionFields, `Profile selection ${index}`);
    assertString(selection.qualificationId, `Profile selection ${index} qualificationId`);
    if (!Array.isArray(selection.unitIds)) {
      throw new Error(`Profile selection ${index} unitIds must be an array`);
    }
    const unitIds = selection.unitIds.map((unitId) => {
      assertString(unitId, `Profile selection ${index} unit ID`);
      return unitId;
    });
    return { qualificationId: selection.qualificationId, unitIds };
  });
}

export function parseStoredPreparationProfile(value: unknown): PreparationProfile {
  if (!isRecord(value)) throw new Error("Preparation profile must be an object");
  if (value.schemaVersion !== 1) {
    throw new UnsupportedProfileError("Preparation profile schema is unsupported");
  }
  assertExactFields(value, rootFields, "Preparation profile");
  assertString(value.guestSpaceId, "Preparation profile guestSpaceId");
  assertString(value.exam, "Preparation profile exam");
  assertString(value.entryCycle, "Preparation profile entryCycle");
  assertString(value.curriculumSystem, "Preparation profile curriculumSystem");
  assertString(value.experience, "Preparation profile experience");
  assertString(value.createdAt, "Preparation profile createdAt");
  assertString(value.updatedAt, "Preparation profile updatedAt");

  return createPreparationProfile({
    guestSpaceId: value.guestSpaceId,
    exam: value.exam as "TMUA",
    entryCycle: value.entryCycle,
    curriculumSystem: value.curriculumSystem as "caie" | "pearson-ial" | "ib" | "ap",
    selections: parseSelections(value.selections),
    experience: value.experience as PreparationExperience,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  });
}

export class LocalPreparationProfileStore implements PreparationProfileStore {
  private readonly memoryProfiles = new Map<GuestSpaceId, PreparationProfile>();

  constructor(
    private readonly storage: Storage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async load(guestSpaceId: GuestSpaceId): Promise<PreparationProfileLoadResult> {
    let raw: string | null;
    try {
      raw = this.storage.getItem(storageKey(guestSpaceId));
    } catch {
      return { profile: this.memoryProfiles.get(guestSpaceId) ?? null, issue: null };
    }
    if (raw === null) {
      return { profile: this.memoryProfiles.get(guestSpaceId) ?? null, issue: null };
    }

    try {
      const profile = parseStoredPreparationProfile(JSON.parse(raw) as unknown);
      if (profile.guestSpaceId !== guestSpaceId) {
        throw new Error("Preparation profile crosses the Guest Space boundary");
      }
      this.memoryProfiles.set(guestSpaceId, profile);
      return { profile, issue: null };
    } catch (error) {
      this.memoryProfiles.delete(guestSpaceId);
      this.quarantine(guestSpaceId, raw);
      return {
        profile: null,
        issue: error instanceof UnsupportedProfileError ? "unsupported" : "corrupt",
      };
    }
  }

  async save(profile: PreparationProfile): Promise<{ persisted: boolean }> {
    const normalized = parseStoredPreparationProfile(JSON.parse(JSON.stringify(profile)) as unknown);
    this.memoryProfiles.set(normalized.guestSpaceId, normalized);
    try {
      this.storage.setItem(storageKey(normalized.guestSpaceId), JSON.stringify(normalized));
      return { persisted: true };
    } catch {
      return { persisted: false };
    }
  }

  async clear(guestSpaceId: GuestSpaceId): Promise<void> {
    this.memoryProfiles.delete(guestSpaceId);
    try {
      this.storage.removeItem(storageKey(guestSpaceId));
    } catch {
      // Memory state remains cleared when browser persistence is unavailable.
    }
  }

  private quarantine(guestSpaceId: GuestSpaceId, raw: string): void {
    const timestamp = this.now().toISOString().replace(/[:.]/g, "-");
    try {
      this.storage.setItem(`${corruptKeyPrefix(guestSpaceId)}${timestamp}`, raw);
    } catch {
      // Keep the corruption classification even if the raw value cannot be copied.
    }
    try {
      this.storage.removeItem(storageKey(guestSpaceId));
    } catch {
      // The malformed profile is never returned even when removal is unavailable.
    }
  }
}
