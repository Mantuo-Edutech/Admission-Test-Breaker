import rawPaper from "../../../../content/esat/original-practice/physics-full-mock-v1.json" with { type: "json" };
import { loadEsatOriginalMock } from "./esat-original-starter.js";

export const ESAT_PHYSICS_FULL_MOCK = loadEsatOriginalMock(rawPaper, {
  id: "esat-physics-full-mock-v1",
  requiredKnowledgeTags: [
    "physics-electricity",
    "physics-magnetism",
    "physics-mechanics",
    "physics-thermal",
    "physics-matter",
    "physics-waves",
    "physics-radioactivity",
  ],
});
