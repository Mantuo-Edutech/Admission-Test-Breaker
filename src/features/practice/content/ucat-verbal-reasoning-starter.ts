import rawStarter from "../../../../content/ucat/original-practice/verbal-reasoning-starter-v1.json" with { type: "json" };
import { loadOriginalChoiceStarter } from "./esat-original-starter.js";

export const UCAT_VERBAL_REASONING_STARTER = loadOriginalChoiceStarter(rawStarter, {
  id: "ucat-verbal-reasoning-starter-v1",
  exam: "UCAT",
  sourcePath: "content/ucat/original-practice/verbal-reasoning-starter-v1.json",
  questionCount: 12,
  durationMinutes: 6,
  requiredKnowledgeTags: [
    "ucat-vr-explicit-information",
    "ucat-vr-contradiction",
    "ucat-vr-insufficient-information",
    "ucat-vr-conclusion",
    "ucat-vr-quantity-check",
    "ucat-vr-inference",
    "ucat-vr-future-claim",
    "ucat-vr-summary",
    "ucat-vr-comparison",
    "ucat-vr-proportion",
    "ucat-vr-extrapolation",
    "ucat-vr-study-limit",
  ],
});
