import rawPaper from "../../../../content/esat/original-practice/physics-starter-v1.json" with { type: "json" };
import { loadEsatOriginalStarter } from "./esat-original-starter.js";

export const ESAT_PHYSICS_STARTER = loadEsatOriginalStarter(rawPaper, {
  id: "esat-physics-starter-v1",
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
