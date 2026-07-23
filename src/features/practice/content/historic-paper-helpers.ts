import type { InlineRun, PracticeOption, PracticePaper, PracticeQuestion, QuestionBlock } from "./types.js";
import { validatePracticePaper } from "./validate.js";

export const T = String.raw;
export const text = (value: string): InlineRun => ({ kind: "text", value });
export const math = (tex: string): InlineRun => ({ kind: "math", tex });
export const p = (...runs: InlineRun[]): QuestionBlock => ({ kind: "paragraph", runs });
export const d = (tex: string): QuestionBlock => ({ kind: "display-math", tex });
export const fig = (src: string, alt: string): QuestionBlock => ({ kind: "figure", src, alt });
export const mo = (...values: string[]): PracticeOption[] => values.map((tex, index) => ({ label: String.fromCharCode(65 + index), content: [d(tex)] }));
export const to = (...values: string[]): PracticeOption[] => values.map((value, index) => ({ label: String.fromCharCode(65 + index), content: [p(text(value))] }));
export const combos = to("none of them", "I only", "II only", "III only", "I and II only", "I and III only", "II and III only", "I, II and III");

interface HistoricQuestion {
  prompt: QuestionBlock[];
  options: PracticeOption[];
  knowledge?: string;
  skills?: string[];
  sourcePage?: number;
}

export function defineHistoricPaper(input: {
  id: string;
  edition: string;
  paper: 1 | 2;
  answers: string;
  sourceQuestionPath: string;
  sourceAnswerPath: string;
  explanationResourceId?: string;
  sourcePages?: number[];
  questions: HistoricQuestion[];
}): PracticePaper {
  const questions: PracticeQuestion[] = input.questions.map((question, index) => ({
    id: `${input.id}-q${String(index + 1).padStart(2, "0")}`,
    number: index + 1,
    sourcePage: question.sourcePage ?? input.sourcePages?.[index] ?? index + 3,
    prompt: question.prompt,
    options: question.options,
    correctAnswer: input.answers[index]!,
    knowledgeTags: [question.knowledge ?? "algebra-and-functions"],
    skillTags: question.skills ?? ["multi-step-planning"],
    reviewStatus: "verified",
    sourceQuestionPath: input.sourceQuestionPath,
    sourceAnswerPath: input.sourceAnswerPath,
    ...(input.explanationResourceId === undefined
      ? {}
      : { explanationResourceId: input.explanationResourceId }),
  }));
  const paper: PracticePaper = {
    id: input.id,
    exam: "TMUA",
    edition: input.edition,
    paper: input.paper,
    durationMinutes: 75,
    deliveryMode: "structured",
    questions,
  };
  const issues = validatePracticePaper(paper);
  if (issues.length > 0) throw new Error(`${input.id} content is invalid: ${issues.map((issue) => issue.code).join(", ")}`);
  return paper;
}
