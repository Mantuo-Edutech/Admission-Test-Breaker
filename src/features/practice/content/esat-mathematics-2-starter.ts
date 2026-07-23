import rawPaper from "../../../../content/esat/original-practice/mathematics-2-starter-v1.json" with { type: "json" };
import { loadEsatOriginalStarter } from "./esat-original-starter.js";

export const ESAT_MATHEMATICS_2_STARTER = loadEsatOriginalStarter(rawPaper, {
  id: "esat-mathematics-2-starter-v1",
  requiredKnowledgeTags: [
    "m2-algebra-functions",
    "m2-sequences-series",
    "m2-coordinate-geometry",
    "m2-trigonometry",
    "m2-exponentials-logs",
    "m2-differentiation",
    "m2-integration",
    "m2-graphs",
  ],
});
