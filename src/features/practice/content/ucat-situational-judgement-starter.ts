import rawStarter from "../../../../content/ucat/original-practice/situational-judgement-starter-v1.json" with { type: "json" };
import { loadOriginalChoiceStarter } from "./esat-original-starter.js";

export const UCAT_SITUATIONAL_JUDGEMENT_STARTER = loadOriginalChoiceStarter(rawStarter, {
  id: "ucat-situational-judgement-starter-v1",
  exam: "UCAT",
  sourcePath: "content/ucat/original-practice/situational-judgement-starter-v1.json",
  questionCount: 10,
  durationMinutes: 5,
  requiredKnowledgeTags: [
    "ucat-sjt-record-integrity",
    "ucat-sjt-patient-safety",
    "ucat-sjt-confidentiality",
    "ucat-sjt-speaking-up",
    "ucat-sjt-access-boundary",
    "ucat-sjt-boundaries",
    "ucat-sjt-disclosure",
    "ucat-sjt-respect",
    "ucat-sjt-teamwork",
    "ucat-sjt-constructive-action",
  ],
});
