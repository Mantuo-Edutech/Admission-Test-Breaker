import {
  asGuestSpaceId,
  assertCanonicalUtcTimestamp,
  type GuestSpaceId,
} from "../../platform/shared/ids.js";
import {
  qualificationById,
  type CurriculumSystemId,
} from "./catalog.js";

export type PreparationExperience =
  | "new"
  | "sampled"
  | "mocked"
  | "past-papers";

export interface QualificationSelection {
  readonly qualificationId: string;
  readonly unitIds: readonly string[];
}

export interface PreparationProfile {
  readonly schemaVersion: 1;
  readonly guestSpaceId: GuestSpaceId;
  readonly exam: "TMUA";
  readonly entryCycle: string;
  readonly curriculumSystem: CurriculumSystemId;
  readonly selections: readonly QualificationSelection[];
  readonly experience: PreparationExperience;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePreparationProfileInput {
  guestSpaceId: string;
  exam: "TMUA";
  entryCycle: string;
  curriculumSystem: CurriculumSystemId;
  selections: readonly QualificationSelection[];
  experience: PreparationExperience;
  createdAt: string;
  updatedAt: string;
}

const experienceValues = new Set<PreparationExperience>([
  "new",
  "sampled",
  "mocked",
  "past-papers",
]);

export function createPreparationProfile(
  input: CreatePreparationProfileInput,
): PreparationProfile {
  const guestSpaceId = asGuestSpaceId(input.guestSpaceId);
  if (input.exam !== "TMUA") {
    throw new Error("Preparation profile exam is unsupported");
  }
  if (!/^20\d{2}$/.test(input.entryCycle)) {
    throw new Error("Entry cycle must be a four-digit year beginning with 20");
  }
  if (!["caie", "pearson-ial", "ib", "ap"].includes(input.curriculumSystem)) {
    throw new Error("Curriculum system is unsupported");
  }
  if (!experienceValues.has(input.experience)) {
    throw new Error("Preparation experience is unsupported");
  }
  if (!Array.isArray(input.selections) || input.selections.length === 0) {
    throw new Error("At least one qualification selection is required");
  }

  const qualificationIds = input.selections.map((selection) => selection.qualificationId);
  if (new Set(qualificationIds).size !== qualificationIds.length) {
    throw new Error("Qualification selections cannot contain duplicates");
  }

  const selections = input.selections.map((selection) => {
    const qualification = qualificationById(selection.qualificationId);
    if (qualification === null || qualification.system !== input.curriculumSystem) {
      throw new Error("Qualification does not belong to the selected curriculum system");
    }
    const rawUnitIds: unknown = selection.unitIds;
    if (
      !Array.isArray(rawUnitIds) ||
      rawUnitIds.length === 0 ||
      !rawUnitIds.every(
        (unitId: unknown) => typeof unitId === "string" && unitId.length > 0,
      )
    ) {
      throw new Error(`At least one unit is required for ${qualification.id}`);
    }
    const unitIds = rawUnitIds as string[];
    if (new Set(unitIds).size !== unitIds.length) {
      throw new Error(`Units for ${qualification.id} cannot contain duplicates`);
    }
    const allowedUnits = new Set(qualification.units.map((unit) => unit.id));
    if (unitIds.some((unitId) => !allowedUnits.has(unitId))) {
      throw new Error(`A selected unit does not belong to ${qualification.id}`);
    }
    return {
      qualificationId: qualification.id,
      unitIds: [...unitIds],
    };
  });

  assertCanonicalUtcTimestamp(input.createdAt, "Preparation profile createdAt");
  assertCanonicalUtcTimestamp(input.updatedAt, "Preparation profile updatedAt");
  if (Date.parse(input.updatedAt) < Date.parse(input.createdAt)) {
    throw new Error("Preparation profile updatedAt cannot precede createdAt");
  }

  return {
    schemaVersion: 1,
    guestSpaceId,
    exam: "TMUA",
    entryCycle: input.entryCycle,
    curriculumSystem: input.curriculumSystem,
    selections,
    experience: input.experience,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}
