import { ESAT_BIOLOGY_FULL_MOCK } from "./esat-biology-full-mock.js";
import { ESAT_BIOLOGY_STARTER } from "./esat-biology-starter.js";
import { ESAT_CHEMISTRY_FULL_MOCK } from "./esat-chemistry-full-mock.js";
import { ESAT_CHEMISTRY_STARTER } from "./esat-chemistry-starter.js";
import { ESAT_MATHEMATICS_1_STARTER } from "./esat-mathematics-1-starter.js";
import { ESAT_MATHEMATICS_1_FULL_MOCK } from "./esat-mathematics-1-full-mock.js";
import { ESAT_MATHEMATICS_2_STARTER } from "./esat-mathematics-2-starter.js";
import { ESAT_MATHEMATICS_2_FULL_MOCK } from "./esat-mathematics-2-full-mock.js";
import { ESAT_PHYSICS_STARTER } from "./esat-physics-starter.js";
import { ESAT_PHYSICS_FULL_MOCK } from "./esat-physics-full-mock.js";

export const ESAT_STARTERS = [
  ESAT_MATHEMATICS_1_STARTER,
  ESAT_MATHEMATICS_2_STARTER,
  ESAT_PHYSICS_STARTER,
  ESAT_CHEMISTRY_STARTER,
  ESAT_BIOLOGY_STARTER,
] as const;

export const ESAT_FULL_MOCKS = [
  ESAT_MATHEMATICS_1_FULL_MOCK,
  ESAT_MATHEMATICS_2_FULL_MOCK,
  ESAT_PHYSICS_FULL_MOCK,
  ESAT_CHEMISTRY_FULL_MOCK,
  ESAT_BIOLOGY_FULL_MOCK,
] as const;

export function getEsatStarter(paperId: string) {
  return ESAT_STARTERS.find((paper) => paper.id === paperId) ?? null;
}

export function getEsatPracticePaper(paperId: string) {
  return getEsatStarter(paperId)
    ?? ESAT_FULL_MOCKS.find((paper) => paper.id === paperId)
    ?? null;
}
