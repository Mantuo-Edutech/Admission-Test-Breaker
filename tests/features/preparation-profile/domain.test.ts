import { describe, expect, it } from "vitest";
import {
  createPreparationProfile,
  type CreatePreparationProfileInput,
} from "../../../src/features/preparation-profile/domain.js";

const validInput: CreatePreparationProfileInput = {
  guestSpaceId: "gsp_profile-one",
  exam: "TMUA",
  entryCycle: "2027",
  curriculumSystem: "caie",
  selections: [
    {
      qualificationId: "caie-9709-2026-2027",
      unitIds: ["p1", "s1"],
    },
  ],
  experience: "sampled",
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
};

describe("preparation profile domain", () => {
  it("creates an evidence-neutral exact curriculum profile", () => {
    expect(createPreparationProfile(validInput)).toEqual({
      schemaVersion: 1,
      ...validInput,
    });
  });

  it("keeps modules scoped to their qualification", () => {
    const profile = createPreparationProfile({
      ...validInput,
      curriculumSystem: "pearson-ial",
      selections: [
        {
          qualificationId: "pearson-ial-mathematics-issue-3",
          unitIds: ["p1", "p2", "m1"],
        },
        {
          qualificationId: "pearson-ial-further-mathematics-issue-3",
          unitIds: ["fp1", "fp2", "m2"],
        },
      ],
    });

    expect(profile.selections).toHaveLength(2);
    expect(profile).not.toHaveProperty("coverage");
    expect(profile).not.toHaveProperty("readiness");
  });

  it.each([
    {
      name: "has no qualification",
      input: { ...validInput, selections: [] },
      error: /qualification selection/,
    },
    {
      name: "has no unit",
      input: {
        ...validInput,
        selections: [{ qualificationId: "caie-9709-2026-2027", unitIds: [] }],
      },
      error: /At least one unit/,
    },
    {
      name: "mixes curriculum systems",
      input: {
        ...validInput,
        selections: [
          {
            qualificationId: "pearson-ial-mathematics-issue-3",
            unitIds: ["p1"],
          },
        ],
      },
      error: /curriculum system/,
    },
    {
      name: "uses an unknown unit",
      input: {
        ...validInput,
        selections: [
          { qualificationId: "caie-9709-2026-2027", unitIds: ["unknown"] },
        ],
      },
      error: /does not belong/,
    },
    {
      name: "duplicates a qualification",
      input: {
        ...validInput,
        selections: [validInput.selections[0]!, validInput.selections[0]!],
      },
      error: /duplicates/,
    },
    {
      name: "has an invalid entry cycle",
      input: { ...validInput, entryCycle: "27" },
      error: /Entry cycle/,
    },
    {
      name: "moves updatedAt before createdAt",
      input: { ...validInput, updatedAt: "2026-07-13T23:59:59.000Z" },
      error: /cannot precede/,
    },
  ])("rejects a profile that $name", ({ input, error }) => {
    expect(() => createPreparationProfile(input)).toThrow(error);
  });
});
