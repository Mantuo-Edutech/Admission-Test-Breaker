import type { PracticePaper, PracticeQuestion } from "../content/types.js";
import { essayResponseIsComplete } from "./essay-response.js";
import { statementSetIsComplete } from "./statement-response.js";
import { mostLeastAnswerIsComplete } from "./most-least-response.js";

export function practiceQuestionIsComplete(
  paper: PracticePaper,
  question: PracticeQuestion,
  value: string | undefined,
): boolean {
  if (paper.responseMode === "essay") return essayResponseIsComplete(value);
  if (question.responseMode === "statement-set") {
    return statementSetIsComplete(question.statements ?? [], value);
  }
  if (question.responseMode === "most-least-choice") return mostLeastAnswerIsComplete(value);
  return value !== undefined && value !== "";
}
