import {
  loadPracticePaper,
} from "../content/practice-paper-registry.js";
import type { PracticeQuestion } from "../content/types.js";
import { calculateResults, type PracticeResults } from "../domain/results.js";
import type { PracticeSession } from "../domain/session.js";
import type {
  DeliveredPracticePaper,
  DeliveredPracticeQuestion,
  PracticeDeliveryService,
} from "./domain.js";

function deliveredQuestion(
  question: PracticeQuestion,
): DeliveredPracticeQuestion {
  return {
    id: question.id,
    number: question.number,
    sourcePage: question.sourcePage,
    ...(question.passageId === undefined ? {} : { passageId: question.passageId }),
    ...(question.responseMode === undefined ? {} : { responseMode: question.responseMode }),
    prompt: question.prompt,
    options: question.options,
    ...(question.statements === undefined
      ? {}
      : { statements: question.statements.map(({ id, content }) => ({ id, content })) }),
    ...(question.scoring === undefined ? {} : { scoring: { kind: question.scoring.kind } }),
    knowledgeTags: question.knowledgeTags,
    skillTags: question.skillTags,
    ...(question.explanationResourceId === undefined
      ? {}
      : { explanationResourceId: question.explanationResourceId }),
  };
}

export class TestPracticeDeliveryService implements PracticeDeliveryService {
  readonly configured = true;

  async loadPaper(paperId: string): Promise<DeliveredPracticePaper | null> {
    const paper = await loadPracticePaper(paperId);
    if (paper === null) return null;
    return {
      id: paper.id,
      exam: paper.exam,
      edition: paper.edition,
      ...(paper.paper === undefined ? {} : { paper: paper.paper }),
      ...(paper.sectionId === undefined ? {} : { sectionId: paper.sectionId }),
      ...(paper.sectionLabel === undefined ? {} : { sectionLabel: paper.sectionLabel }),
      ...(paper.sectionLabelZh === undefined ? {} : { sectionLabelZh: paper.sectionLabelZh }),
      durationMinutes: paper.durationMinutes,
      deliveryMode: paper.deliveryMode,
      ...(paper.calculator === undefined ? {} : { calculator: paper.calculator }),
      ...(paper.responseMode === undefined ? {} : { responseMode: paper.responseMode }),
      ...(paper.essayTask === undefined ? {} : { essayTask: paper.essayTask }),
      ...(paper.passages === undefined ? {} : { passages: paper.passages }),
      questions: paper.questions.map(deliveredQuestion),
      ...(paper.access === undefined ? {} : { access: paper.access }),
      contentRef: paper.contentRef,
    };
  }

  async score(session: PracticeSession): Promise<PracticeResults> {
    const paper = await loadPracticePaper(session.paperId);
    if (paper === null) throw new Error("Test practice paper is unavailable");
    return calculateResults(paper, session);
  }
}
