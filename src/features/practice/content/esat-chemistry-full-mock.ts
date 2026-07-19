import rawPaper from "../../../../content/esat/original-practice/chemistry-full-mock-v1.json" with { type: "json" };
import { loadEsatOriginalMock } from "./esat-original-starter.js";

export const ESAT_CHEMISTRY_FULL_MOCK = loadEsatOriginalMock(rawPaper, {
  id: "esat-chemistry-full-mock-v1",
  requiredKnowledgeTags: [
    "chem-atomic",
    "chem-periodic",
    "chem-equations",
    "chem-quantitative",
    "chem-redox",
    "chem-bonding",
    "chem-groups",
    "chem-separation",
    "chem-acids",
    "chem-rates",
    "chem-energetics",
    "chem-electrolysis",
    "chem-organic",
    "chem-metals",
    "chem-particles",
    "chem-tests",
    "chem-air-water",
  ],
});
