import rawPaper from "../../../../content/tara/original-practice/reasoning-starter-v1.json" with { type: "json" };
import { loadOriginalChoiceStarter } from "./esat-original-starter.js";

export const TARA_REASONING_STARTER = loadOriginalChoiceStarter(rawPaper, {
  id: "tara-reasoning-starter-v1",
  exam: "TARA",
  sourcePath: "content/tara/original-practice/reasoning-starter-v1.json",
  questionCount: 10,
  durationMinutes: 20,
  requiredKnowledgeTags: [
    "tara-critical-main-conclusion",
    "tara-critical-assumption",
    "tara-critical-flaw",
    "tara-critical-evidence",
    "tara-critical-inference",
    "tara-problem-ordering",
    "tara-problem-constraints",
    "tara-problem-arithmetic",
    "tara-problem-sets",
    "tara-problem-rates",
  ],
});
