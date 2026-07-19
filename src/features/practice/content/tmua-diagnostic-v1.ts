import rawPaper from "../../../../content/tmua/original-practice/diagnostic-v1.json" with { type: "json" };
import { loadOriginalChoiceStarter } from "./esat-original-starter.js";

export const TMUA_DIAGNOSTIC_V1 = loadOriginalChoiceStarter(rawPaper, {
  id: "tmua-diagnostic-v1",
  exam: "TMUA",
  sourcePath: "content/tmua/original-practice/diagnostic-v1.json",
  questionCount: 8,
  durationMinutes: 30,
  requiredKnowledgeTags: [
    "algebra-and-functions",
    "quadratics",
    "coordinate-geometry-circles",
    "sequences-and-series",
    "trigonometric-equations",
    "differentiation",
    "mathematical-logic",
    "mathematical-proof",
  ],
});
