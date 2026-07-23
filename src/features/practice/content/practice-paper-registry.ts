import { getEsatPracticePaper } from "./esat-starters.js";
import { LNAT_SECTION_A_STARTER } from "./lnat-section-a-starter.js";
import { LNAT_SECTION_B_WRITING } from "./lnat-section-b-writing.js";
import { TARA_REASONING_STARTER } from "./tara-reasoning-starter.js";
import { TARA_WRITING_TASK } from "./tara-writing-task.js";
import { TMUA_DIAGNOSTIC_V1 } from "./tmua-diagnostic-v1.js";
import { UCAT_QUANTITATIVE_REASONING_STARTER } from "./ucat-quantitative-reasoning-starter.js";
import { UCAT_DECISION_MAKING_STARTER } from "./ucat-decision-making-starter.js";
import { UCAT_SITUATIONAL_JUDGEMENT_STARTER } from "./ucat-situational-judgement-starter.js";
import { UCAT_VERBAL_REASONING_STARTER } from "./ucat-verbal-reasoning-starter.js";
import { getTmuaPracticePaper } from "./tmua-online-registry.js";
import type { PracticePaper } from "./types.js";
import {
  publishPracticePaper,
  type PublishedPracticePaper,
} from "./published-revisions.js";

export {
  practicePaperPresentation,
  type PracticePaperPresentation,
} from "./practice-paper-presentation.js";

const ROUTE_ONLY_PAPER_IDS = new Set([
  "tara-critical-thinking-full-mock-v1",
  "tara-problem-solving-full-mock-v1",
  "lnat-section-a-full-mock-v1",
  "ucat-verbal-reasoning-full-mock-v1",
  "ucat-decision-making-full-mock-v1",
  "ucat-quantitative-reasoning-full-mock-v1",
  "ucat-situational-judgement-full-mock-v1",
]);
const dynamicallyLoadedPapers = new Map<string, PublishedPracticePaper>();

export function getPracticePaper(paperId: string): PublishedPracticePaper | null {
  const dynamicallyLoaded = dynamicallyLoadedPapers.get(paperId);
  if (dynamicallyLoaded !== undefined) return dynamicallyLoaded;
  const paper = paperId === TMUA_DIAGNOSTIC_V1.id ? TMUA_DIAGNOSTIC_V1
    : paperId === UCAT_SITUATIONAL_JUDGEMENT_STARTER.id ? UCAT_SITUATIONAL_JUDGEMENT_STARTER
    : paperId === UCAT_DECISION_MAKING_STARTER.id ? UCAT_DECISION_MAKING_STARTER
    : paperId === UCAT_QUANTITATIVE_REASONING_STARTER.id ? UCAT_QUANTITATIVE_REASONING_STARTER
    : paperId === LNAT_SECTION_B_WRITING.id ? LNAT_SECTION_B_WRITING
    : paperId === TARA_WRITING_TASK.id ? TARA_WRITING_TASK
    : paperId === UCAT_VERBAL_REASONING_STARTER.id ? UCAT_VERBAL_REASONING_STARTER
    : paperId === LNAT_SECTION_A_STARTER.id ? LNAT_SECTION_A_STARTER
    : paperId === TARA_REASONING_STARTER.id ? TARA_REASONING_STARTER
    : getEsatPracticePaper(paperId) ?? getTmuaPracticePaper(paperId);
  return paper === null ? null : publishPracticePaper(paper);
}

/**
 * Loads large, route-only paper datasets without adding them to every practice
 * page bundle. Synchronous callers can use getPracticePaper after this resolves.
 */
export async function loadPracticePaper(paperId: string): Promise<PublishedPracticePaper | null> {
  const existing = getPracticePaper(paperId);
  if (existing !== null) return existing;
  if (!ROUTE_ONLY_PAPER_IDS.has(paperId)) return null;

  const paper = paperId === "lnat-section-a-full-mock-v1"
    ? (await import("./lnat-section-a-full-mock.js")).LNAT_SECTION_A_FULL_MOCK
    : paperId === "ucat-verbal-reasoning-full-mock-v1"
      ? (await import("./ucat-verbal-reasoning-full-mock.js")).UCAT_VERBAL_REASONING_FULL_MOCK
      : paperId === "ucat-decision-making-full-mock-v1"
        ? (await import("./ucat-decision-making-full-mock.js")).UCAT_DECISION_MAKING_FULL_MOCK
      : paperId === "ucat-quantitative-reasoning-full-mock-v1"
        ? (await import("./ucat-quantitative-reasoning-full-mock.js")).UCAT_QUANTITATIVE_REASONING_FULL_MOCK
      : paperId === "ucat-situational-judgement-full-mock-v1"
        ? (await import("./ucat-situational-judgement-full-mock.js")).UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK
      : (await import("./tara-full-mocks.js")).getTaraFullMock(paperId);
  if (paper === null) return null;
  const published = publishPracticePaper(paper);
  dynamicallyLoadedPapers.set(paperId, published);
  return published;
}
