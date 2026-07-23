import { ESAT_FULL_MOCKS, ESAT_STARTERS } from "../../src/features/practice/content/esat-starters.js";
import { LNAT_SECTION_A_FULL_MOCK } from "../../src/features/practice/content/lnat-section-a-full-mock.js";
import { LNAT_SECTION_A_STARTER } from "../../src/features/practice/content/lnat-section-a-starter.js";
import { LNAT_SECTION_B_WRITING } from "../../src/features/practice/content/lnat-section-b-writing.js";
import {
  TARA_CRITICAL_THINKING_FULL_MOCK,
  TARA_PROBLEM_SOLVING_FULL_MOCK,
} from "../../src/features/practice/content/tara-full-mocks.js";
import { TARA_REASONING_STARTER } from "../../src/features/practice/content/tara-reasoning-starter.js";
import { TARA_WRITING_TASK } from "../../src/features/practice/content/tara-writing-task.js";
import { TMUA_DIAGNOSTIC_V1 } from "../../src/features/practice/content/tmua-diagnostic-v1.js";
import {
  getTmuaPracticePaper,
  TMUA_ONLINE_PAPERS,
} from "../../src/features/practice/content/tmua-online-registry.js";
import type { PracticePaper } from "../../src/features/practice/content/types.js";
import { UCAT_DECISION_MAKING_FULL_MOCK } from "../../src/features/practice/content/ucat-decision-making-full-mock.js";
import { UCAT_DECISION_MAKING_STARTER } from "../../src/features/practice/content/ucat-decision-making-starter.js";
import { UCAT_QUANTITATIVE_REASONING_FULL_MOCK } from "../../src/features/practice/content/ucat-quantitative-reasoning-full-mock.js";
import { UCAT_QUANTITATIVE_REASONING_STARTER } from "../../src/features/practice/content/ucat-quantitative-reasoning-starter.js";
import { UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK } from "../../src/features/practice/content/ucat-situational-judgement-full-mock.js";
import { UCAT_SITUATIONAL_JUDGEMENT_STARTER } from "../../src/features/practice/content/ucat-situational-judgement-starter.js";
import { UCAT_VERBAL_REASONING_FULL_MOCK } from "../../src/features/practice/content/ucat-verbal-reasoning-full-mock.js";
import { UCAT_VERBAL_REASONING_STARTER } from "../../src/features/practice/content/ucat-verbal-reasoning-starter.js";

function requiredTmuaPaper(paperId: string): PracticePaper {
  const paper = getTmuaPracticePaper(paperId);
  if (paper === null) throw new Error(`Published TMUA paper is missing: ${paperId}`);
  return paper;
}

/**
 * Authoritative inventory used by the publication verifier. This module is
 * intentionally script-only so importing it never pulls every large paper into
 * the student application's initial bundle.
 */
export function allPublishedPracticePapers(): readonly PracticePaper[] {
  const papers: readonly PracticePaper[] = [
    ...TMUA_ONLINE_PAPERS.map((record) => requiredTmuaPaper(record.id)),
    TMUA_DIAGNOSTIC_V1,
    ...ESAT_STARTERS,
    ...ESAT_FULL_MOCKS,
    TARA_REASONING_STARTER,
    TARA_CRITICAL_THINKING_FULL_MOCK,
    TARA_PROBLEM_SOLVING_FULL_MOCK,
    TARA_WRITING_TASK,
    LNAT_SECTION_A_STARTER,
    LNAT_SECTION_A_FULL_MOCK,
    LNAT_SECTION_B_WRITING,
    UCAT_VERBAL_REASONING_STARTER,
    UCAT_VERBAL_REASONING_FULL_MOCK,
    UCAT_DECISION_MAKING_STARTER,
    UCAT_DECISION_MAKING_FULL_MOCK,
    UCAT_QUANTITATIVE_REASONING_STARTER,
    UCAT_QUANTITATIVE_REASONING_FULL_MOCK,
    UCAT_SITUATIONAL_JUDGEMENT_STARTER,
    UCAT_SITUATIONAL_JUDGEMENT_FULL_MOCK,
  ];
  const ids = papers.map((paper) => paper.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Published practice paper inventory contains duplicate IDs");
  }
  return papers;
}
