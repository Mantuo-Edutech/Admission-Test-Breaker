import { describe, expect, it } from "vitest";
import {
  ESAT_ADMISSIONS_REGISTRY,
  resolveEsatProgrammeSelection,
} from "../../../src/features/catalog/esat-admissions.js";

describe("ESAT 2027 programme-to-module rules", () => {
  it("keeps the complete verified four-institution registry", () => {
    expect(ESAT_ADMISSIONS_REGISTRY.institutions).toHaveLength(4);
    expect(ESAT_ADMISSIONS_REGISTRY.programmes).toHaveLength(56);
    expect(
      Object.fromEntries(
        ESAT_ADMISSIONS_REGISTRY.institutions.map((institution) => [
          institution.id,
          ESAT_ADMISSIONS_REGISTRY.programmes.filter(
            (programme) => programme.institutionId === institution.id,
          ).length,
        ]),
      ),
    ).toEqual({ imperial: 33, cambridge: 4, oxford: 17, ucl: 2 });
    expect(
      ESAT_ADMISSIONS_REGISTRY.programmes.every((programme) =>
        programme.rule.required.includes("mathematics-1"),
      ),
    ).toBe(true);
  });

  it("resolves fixed two- and three-module requirements", () => {
    expect(resolveEsatProgrammeSelection(["imperial-h401"])).toMatchObject({
      status: "resolved",
      fixedModules: expect.arrayContaining(["mathematics-1", "mathematics-2", "physics"]),
    });
    expect(resolveEsatProgrammeSelection(["imperial-28g3"])).toMatchObject({
      status: "resolved",
      fixedModules: expect.arrayContaining(["mathematics-1", "mathematics-2"]),
    });
  });

  it("shows every valid option when the course permits a free module choice", () => {
    const resolution = resolveEsatProgrammeSelection(["ucl-h600"]);

    expect(resolution.status).toBe("choice_required");
    expect(resolution.fixedModules).toEqual(["mathematics-1"]);
    expect(resolution.options).toHaveLength(6);
  });

  it("combines compatible UCAS choices and identifies impossible combinations", () => {
    expect(resolveEsatProgrammeSelection(["ucl-h600", "imperial-h401"])).toMatchObject({
      status: "resolved",
      fixedModules: expect.arrayContaining(["mathematics-1", "mathematics-2", "physics"]),
    });
    expect(resolveEsatProgrammeSelection(["imperial-h801", "imperial-h401"])).toMatchObject({
      status: "conflict",
      options: [],
    });
  });
});
