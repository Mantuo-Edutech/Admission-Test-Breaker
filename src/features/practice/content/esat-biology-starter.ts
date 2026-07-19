import rawPaper from "../../../../content/esat/original-practice/biology-starter-v1.json" with { type: "json" };
import { loadEsatOriginalStarter } from "./esat-original-starter.js";

export const ESAT_BIOLOGY_STARTER = loadEsatOriginalStarter(rawPaper, {
  id: "esat-biology-starter-v1",
  requiredKnowledgeTags: [
    "bio-cells",
    "bio-membranes",
    "bio-division",
    "bio-inheritance",
    "bio-dna",
    "bio-gene-tech",
    "bio-variation",
    "bio-enzymes",
    "bio-animal",
    "bio-ecosystems",
    "bio-plants",
  ],
});
