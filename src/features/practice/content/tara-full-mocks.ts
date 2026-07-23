import criticalThinkingRaw from "../../../../content/tara/original-practice/critical-thinking-full-mock-v1.json" with { type: "json" };
import problemSolvingRaw from "../../../../content/tara/original-practice/problem-solving-full-mock-v1.json" with { type: "json" };
import { loadOriginalChoiceStarter } from "./esat-original-starter.js";

export const TARA_CRITICAL_THINKING_FULL_MOCK = loadOriginalChoiceStarter(criticalThinkingRaw, {
  id: "tara-critical-thinking-full-mock-v1",
  exam: "TARA",
  sourcePath: "content/tara/original-practice/critical-thinking-full-mock-v1.json",
  questionCount: 22,
  durationMinutes: 40,
  requiredKnowledgeTags: [
    "tara-critical-main-conclusion",
    "tara-critical-inference",
    "tara-critical-assumption",
    "tara-critical-evidence",
    "tara-critical-flaw",
    "tara-critical-matching-arguments",
    "tara-critical-applying-principles",
  ],
});

export const TARA_PROBLEM_SOLVING_FULL_MOCK = loadOriginalChoiceStarter(problemSolvingRaw, {
  id: "tara-problem-solving-full-mock-v1",
  exam: "TARA",
  sourcePath: "content/tara/original-practice/problem-solving-full-mock-v1.json",
  questionCount: 22,
  durationMinutes: 40,
  requiredKnowledgeTags: [
    "tara-problem-relevant-selection",
    "tara-problem-finding-procedures",
    "tara-problem-identifying-similarity",
  ],
});

export const TARA_FULL_MOCKS = [
  TARA_CRITICAL_THINKING_FULL_MOCK,
  TARA_PROBLEM_SOLVING_FULL_MOCK,
] as const;

export function getTaraFullMock(paperId: string) {
  return TARA_FULL_MOCKS.find((paper) => paper.id === paperId) ?? null;
}
