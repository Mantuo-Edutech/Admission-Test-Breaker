import {
  deepReviewPackageId,
  PRACTICE_ACCESS_POLICY,
  type PracticeExamId,
} from "../catalog/assessment-registry.js";
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

type PresentablePracticePaper = Pick<
  PracticePaper,
  "id" | "exam" | "edition" | "paper" | "sectionLabel" | "sectionLabelZh" | "durationMinutes" | "access"
> & { readonly questions: readonly unknown[] };

export function practicePaperPresentation(paper: PresentablePracticePaper): PracticePaperPresentation {
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
