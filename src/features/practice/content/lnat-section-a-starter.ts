import rawStarter from "../../../../content/lnat/original-practice/section-a-starter-v1.json" with { type: "json" };
import { loadOriginalChoiceStarter } from "./esat-original-starter.js";

export const LNAT_SECTION_A_STARTER = loadOriginalChoiceStarter(rawStarter, {
  id: "lnat-section-a-starter-v1",
  exam: "LNAT",
  sourcePath: "content/lnat/original-practice/section-a-starter-v1.json",
  questionCount: 12,
  durationMinutes: 30,
  requiredKnowledgeTags: [
    "lnat-main-conclusion",
    "lnat-argument-role",
    "lnat-inference",
    "lnat-strengthen",
    "lnat-recommendation",
    "lnat-sampling-bias",
    "lnat-evidence-evaluation",
    "lnat-context-meaning",
    "lnat-principle",
    "lnat-evidence-limit",
    "lnat-qualification",
    "lnat-analogy",
  ],
});
