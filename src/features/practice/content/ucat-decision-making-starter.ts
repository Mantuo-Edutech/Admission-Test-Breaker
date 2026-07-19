import rawStarter from "../../../../content/ucat/original-practice/decision-making-starter-v1.json" with { type: "json" };
import { loadOriginalChoiceStarter } from "./esat-original-starter.js";

export const UCAT_DECISION_MAKING_STARTER = loadOriginalChoiceStarter(rawStarter, {
  id: "ucat-decision-making-starter-v1",
  exam: "UCAT",
  sourcePath: "content/ucat/original-practice/decision-making-starter-v1.json",
  questionCount: 8,
  durationMinutes: 10,
  requiredKnowledgeTags: [
    "ucat-dm-ordering",
    "ucat-dm-deduction",
    "ucat-dm-bayes-table",
    "ucat-dm-syllogisms",
    "ucat-dm-venn-counting",
    "ucat-dm-strongest-argument",
    "ucat-dm-data-inference",
    "ucat-dm-probability",
  ],
});
