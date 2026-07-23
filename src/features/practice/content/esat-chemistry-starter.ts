import rawPaper from "../../../../content/esat/original-practice/chemistry-starter-v1.json" with { type: "json" };
import { loadEsatOriginalStarter } from "./esat-original-starter.js";

export const ESAT_CHEMISTRY_STARTER = loadEsatOriginalStarter(rawPaper, {
  id: "esat-chemistry-starter-v1",
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
    "chem-particles",
  ],
});
