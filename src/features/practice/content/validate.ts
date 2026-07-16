import type { PracticePaper, ValidationIssue } from "./types.js";

const safeRelativePath = /^(?!\/)(?![A-Za-z]:)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\).+$/;

export function validatePracticePaper(paper: PracticePaper): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const expectedNumbers = Array.from({ length: 20 }, (_, index) => index + 1);
  const numbers = paper.questions.map((question) => question.number);

  if (paper.questions.length !== 20) {
    issues.push({ code: "question-count", message: "Paper must contain 20 questions" });
  }

  if (JSON.stringify(numbers) !== JSON.stringify(expectedNumbers)) {
    issues.push({
      code: "question-sequence",
      message: "Question numbers must be 1 through 20",
    });
  }

  if (new Set(paper.questions.map((question) => question.id)).size !== paper.questions.length) {
    issues.push({
      code: "duplicate-question-id",
      message: "Question IDs must be unique",
    });
  }

  for (const question of paper.questions) {
    const labels = question.options.map((option) => option.label);

    if (question.id !== `${paper.id}-q${String(question.number).padStart(2, "0")}`) {
      issues.push({
        code: "question-id",
        questionId: question.id,
        message: "Question ID must match paper and number",
      });
    }

    if (question.reviewStatus !== "verified") {
      issues.push({
        code: "unverified-question",
        questionId: question.id,
        message: "Runnable questions must be verified",
      });
    }

    if (new Set(labels).size !== labels.length) {
      issues.push({
        code: "duplicate-option",
        questionId: question.id,
        message: "Option labels must be unique",
      });
    }

    if (!labels.includes(question.correctAnswer)) {
      issues.push({
        code: "missing-correct-option",
        questionId: question.id,
        message: "Correct answer must reference an option",
      });
    }

    if (!question.prompt.length || question.options.some((option) => !option.content.length)) {
      issues.push({
        code: "empty-content",
        questionId: question.id,
        message: "Prompt and option content are required",
      });
    }

    for (const path of [question.sourceQuestionPath, question.sourceAnswerPath]) {
      if (!safeRelativePath.test(path)) {
        issues.push({
          code: "unsafe-source-path",
          questionId: question.id,
          message: "Source paths must be safe and repository-relative",
        });
      }
    }
  }

  return issues;
}
