import rawPaper from "../../../../content/esat/original-practice/mathematics-1-full-mock-v1.json" with { type: "json" };
import { loadEsatOriginalMock } from "./esat-original-starter.js";

export const ESAT_MATHEMATICS_1_FULL_MOCK = loadEsatOriginalMock(rawPaper, {
  id: "esat-mathematics-1-full-mock-v1",
  requiredKnowledgeTags: [
    "m1-units",
    "m1-number",
    "m1-ratio",
    "m1-algebra",
    "m1-geometry",
    "m1-statistics",
    "m1-probability",
  ],
});
