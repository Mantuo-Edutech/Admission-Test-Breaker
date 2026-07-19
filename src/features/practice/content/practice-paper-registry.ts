import { deepReviewPackageId, PRACTICE_ACCESS_POLICY, type PracticeExamId } from "../catalog/assessment-registry.js";
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
import type { PracticePaper, PracticePaperAccess } from "./types.js";

export interface PracticePaperPresentation {
  readonly examId: PracticeExamId;
  readonly examName: PracticePaper["exam"];
  readonly title: string;
  readonly subtitle: string;
  readonly backHref: string;
  readonly questionCount: number;
  readonly durationMinutes: number;
  readonly access: PracticePaperAccess;
}

const ROUTE_ONLY_PAPER_IDS = new Set([
  "tara-critical-thinking-full-mock-v1",
  "tara-problem-solving-full-mock-v1",
  "lnat-section-a-full-mock-v1",
  "ucat-verbal-reasoning-full-mock-v1",
  "ucat-decision-making-full-mock-v1",
  "ucat-quantitative-reasoning-full-mock-v1",
  "ucat-situational-judgement-full-mock-v1",
]);
const dynamicallyLoadedPapers = new Map<string, PracticePaper>();

export function getPracticePaper(paperId: string): PracticePaper | null {
  const dynamicallyLoaded = dynamicallyLoadedPapers.get(paperId);
  if (dynamicallyLoaded !== undefined) return dynamicallyLoaded;
  if (paperId === TMUA_DIAGNOSTIC_V1.id) return TMUA_DIAGNOSTIC_V1;
  if (paperId === UCAT_SITUATIONAL_JUDGEMENT_STARTER.id) return UCAT_SITUATIONAL_JUDGEMENT_STARTER;
  if (paperId === UCAT_DECISION_MAKING_STARTER.id) return UCAT_DECISION_MAKING_STARTER;
  if (paperId === UCAT_QUANTITATIVE_REASONING_STARTER.id) return UCAT_QUANTITATIVE_REASONING_STARTER;
  if (paperId === LNAT_SECTION_B_WRITING.id) return LNAT_SECTION_B_WRITING;
  if (paperId === TARA_WRITING_TASK.id) return TARA_WRITING_TASK;
  if (paperId === UCAT_VERBAL_REASONING_STARTER.id) return UCAT_VERBAL_REASONING_STARTER;
  if (paperId === LNAT_SECTION_A_STARTER.id) return LNAT_SECTION_A_STARTER;
  if (paperId === TARA_REASONING_STARTER.id) return TARA_REASONING_STARTER;
  return getEsatPracticePaper(paperId) ?? getTmuaPracticePaper(paperId);
}

/**
 * Loads large, route-only paper datasets without adding them to every practice
 * page bundle. Synchronous callers can use getPracticePaper after this resolves.
 */
export async function loadPracticePaper(paperId: string): Promise<PracticePaper | null> {
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
  if (paper !== null) dynamicallyLoadedPapers.set(paperId, paper);
  return paper;
}

export function practicePaperPresentation(paper: PracticePaper): PracticePaperPresentation {
  const examId = paper.exam.toLowerCase() as PracticeExamId;
  const sectionTitle = paper.sectionLabel ?? (paper.paper === undefined ? "Practice" : `Paper ${paper.paper}`);
  return {
    examId,
    examName: paper.exam,
    title: `${paper.exam} ${paper.edition}`,
    subtitle: paper.sectionLabelZh === undefined ? sectionTitle : `${sectionTitle} · ${paper.sectionLabelZh}`,
    backHref: `/exams/${examId}/past-papers`,
    questionCount: paper.questions.length,
    durationMinutes: paper.durationMinutes,
    access: paper.access ?? {
      ...PRACTICE_ACCESS_POLICY,
      deepReviewPackageId: deepReviewPackageId(examId),
    },
  };
}
