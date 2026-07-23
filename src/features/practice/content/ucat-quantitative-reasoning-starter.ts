import rawStarter from "../../../../content/ucat/original-practice/quantitative-reasoning-starter-v1.json" with { type: "json" };
import { loadOriginalChoiceStarter } from "./esat-original-starter.js";

export const UCAT_QUANTITATIVE_REASONING_STARTER = loadOriginalChoiceStarter(rawStarter, {
  id: "ucat-quantitative-reasoning-starter-v1",
  exam: "UCAT",
  sourcePath: "content/ucat/original-practice/quantitative-reasoning-starter-v1.json",
  questionCount: 10,
  durationMinutes: 8,
  requiredKnowledgeTags: [
    "ucat-qr-percentage-decrease",
    "ucat-qr-time-conversion",
    "ucat-qr-percentage-increase",
    "ucat-qr-inventory-balance",
    "ucat-qr-percentage-of-total",
    "ucat-qr-multi-step-cost",
    "ucat-qr-speed",
    "ucat-qr-rate-per-time",
    "ucat-qr-weighted-percentage",
    "ucat-qr-percentage-points",
  ],
});
