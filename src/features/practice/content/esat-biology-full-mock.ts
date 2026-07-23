import rawPaper from "../../../../content/esat/original-practice/biology-full-mock-v1.json" with { type: "json" };
import { loadEsatOriginalMock } from "./esat-original-starter.js";

export const ESAT_BIOLOGY_FULL_MOCK = loadEsatOriginalMock(rawPaper, {
  id: "esat-biology-full-mock-v1",
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
