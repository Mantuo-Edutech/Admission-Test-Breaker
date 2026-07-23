import type { PracticePaper, ValidationIssue } from "./types.js";
import { getAssessmentSection, type PracticeExamId } from "../catalog/assessment-registry.js";
import { mostLeastAnswerIsComplete, parseMostLeastAnswer } from "../domain/most-least-response.js";

interface PracticePaperValidationExpectation {
  readonly questionCount?: number;
}

const safeRelativePath = /^(?!\/)(?![A-Za-z]:)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\).+$/;
const safeFigurePath = /^\/questions\/[a-z0-9-]+\/[a-z0-9-]+\.svg$/u;

export function validatePracticePaper(
  paper: PracticePaper,
  expectation: PracticePaperValidationExpectation = {},
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const passages = paper.passages ?? [];
  const isEssay = paper.responseMode === "essay";
  const passageIds = new Set(passages.map((passage) => passage.id));
  const section = paper.sectionId === undefined
    ? null
    : getAssessmentSection(paper.exam.toLowerCase() as PracticeExamId, paper.sectionId);
  const expectedQuestionCount = expectation.questionCount
    ?? section?.questionCount
    ?? (paper.exam === "TMUA" ? 20 : paper.questions.length);
  const expectedNumbers = Array.from({ length: expectedQuestionCount }, (_, index) => index + 1);
  const numbers = paper.questions.map((question) => question.number);

  if (paper.questions.length !== expectedQuestionCount) {
    issues.push({ code: "question-count", message: `Paper must contain ${expectedQuestionCount} questions` });
  }

  if (JSON.stringify(numbers) !== JSON.stringify(expectedNumbers)) {
    issues.push({
      code: "question-sequence",
      message: `Question numbers must be 1 through ${expectedQuestionCount}`,
    });
  }

  if (section !== null && paper.durationMinutes !== section.durationMinutes) {
    issues.push({ code: "duration", message: `Paper must use the ${section.durationMinutes}-minute section duration` });
  }

  if (!paper.id.startsWith(`${paper.exam.toLowerCase()}-`)) {
    issues.push({ code: "paper-id", message: "Paper ID must start with its exam ID" });
  }

  if (paper.calculator !== undefined && paper.calculator !== "none" && paper.calculator !== "basic") {
    issues.push({ code: "invalid-calculator", message: "Calculator must be none or basic" });
  }

  if (new Set(paper.questions.map((question) => question.id)).size !== paper.questions.length) {
    issues.push({
      code: "duplicate-question-id",
      message: "Question IDs must be unique",
    });
  }

  if (passageIds.size !== passages.length) {
    issues.push({ code: "duplicate-passage-id", message: "Passage IDs must be unique" });
  }

  if (isEssay) {
    const task = paper.essayTask;
    const promptIds = new Set(task?.prompts.map((prompt) => prompt.id) ?? []);
    if (
      task === undefined ||
      task.prompts.length !== 3 ||
      promptIds.size !== task.prompts.length ||
      task.prompts.some((prompt) =>
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(prompt.id) ||
        prompt.title.trim() === "" ||
        prompt.prompt.trim() === ""
      ) ||
      !Number.isInteger(task.maxWords) ||
      task.maxWords < 100 ||
      task.maxWords > 2_000 ||
      (task.recommendedWords !== undefined && (
        !Number.isInteger(task.recommendedWords.min) ||
        !Number.isInteger(task.recommendedWords.max) ||
        task.recommendedWords.min < 1 ||
        task.recommendedWords.min > task.recommendedWords.max ||
        task.recommendedWords.max > task.maxWords
      ))
    ) {
      issues.push({ code: "invalid-essay-task", message: "Essay papers require three unique prompts and a valid word limit" });
    }
  } else if (paper.essayTask !== undefined) {
    issues.push({ code: "unexpected-essay-task", message: "Choice papers cannot declare an essay task" });
  }

  for (const passage of passages) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(passage.id) || passage.title.trim() === "" || passage.content.length === 0) {
      issues.push({ code: "invalid-passage", message: "Passages require a stable ID, title and content" });
    }
    if (paper.deliveryMode === "structured" && passage.content.some((block) => block.kind === "source-pdf")) {
      issues.push({ code: "structured-paper-pdf-passage", message: "Structured passages cannot expose source PDF blocks" });
    }
    for (const block of passage.content) {
      if (
        block.kind === "table" && (
          block.caption.trim() === "" ||
          block.headers.length === 0 ||
          block.headers.some((header) => header.trim() === "") ||
          block.rows.length === 0 ||
          block.rows.some((row) => row.length !== block.headers.length || row.some((cell) => cell.trim() === ""))
        )
      ) {
        issues.push({ code: "invalid-data-table", message: "Data tables require a caption and a rectangular non-empty grid" });
      }
      if (block.kind === "figure" && !safeFigurePath.test(block.src)) {
        issues.push({ code: "unsafe-passage-figure-path", message: "Passage figures must use repository-owned SVG assets" });
      }
    }
  }

  for (const question of paper.questions) {
    const labels = question.options.map((option) => option.label);
    const isStatementSet = question.responseMode === "statement-set";
    const isMostLeast = question.responseMode === "most-least-choice";
    const statements = question.statements ?? [];

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

    if (question.passageId !== undefined && !passageIds.has(question.passageId)) {
      issues.push({
        code: "missing-passage",
        questionId: question.id,
        message: "Question passageId must reference a passage in the same paper",
      });
    }

    if (new Set(labels).size !== labels.length) {
      issues.push({
        code: "duplicate-option",
        questionId: question.id,
        message: "Option labels must be unique",
      });
    }

    if (!isEssay && !isStatementSet && !isMostLeast && !labels.includes(question.correctAnswer)) {
      issues.push({
        code: "missing-correct-option",
        questionId: question.id,
        message: "Correct answer must reference an option",
      });
    }

    if (isMostLeast) {
      const correct = parseMostLeastAnswer(question.correctAnswer);
      if (
        question.options.length !== 3 ||
        question.scoring?.kind !== "most-least-exact" ||
        !mostLeastAnswerIsComplete(question.correctAnswer) ||
        correct.most === undefined ||
        correct.least === undefined ||
        !labels.includes(correct.most) ||
        !labels.includes(correct.least)
      ) {
        issues.push({
          code: "invalid-most-least-choice",
          questionId: question.id,
          message: "Most/least questions require three actions and a distinct exact answer pair",
        });
      }
    }

    if (isEssay && (question.options.length !== 0 || question.correctAnswer !== "")) {
      issues.push({
        code: "essay-answer-key",
        questionId: question.id,
        message: "Essay questions cannot declare choice options or a correct answer",
      });
    }


    if (isStatementSet) {
      const statementIds = new Set(statements.map((statement) => statement.id));
      if (
        statements.length < 2 ||
        statements.length > 8 ||
        statementIds.size !== statements.length ||
        statements.some((statement) =>
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(statement.id) ||
          statement.content.length === 0 ||
          (statement.correctAnswer !== "yes" && statement.correctAnswer !== "no")
        ) ||
        question.options.length !== 0 ||
        question.correctAnswer !== "" ||
        question.scoring?.kind !== "statement-set-two-point"
      ) {
        issues.push({
          code: "invalid-statement-set",
          questionId: question.id,
          message: "Statement-set questions require stable statements, yes/no keys and two-point scoring",
        });
      }
    } else if (question.statements !== undefined) {
      issues.push({
        code: "unexpected-statements",
        questionId: question.id,
        message: "Only statement-set questions can declare statements",
      });
    }

    if (question.responseMode === "ordinal-choice") {
      const scoring = question.scoring;
      if (
        scoring?.kind !== "adjacent-partial" ||
        scoring.order.length !== labels.length ||
        new Set(scoring.order).size !== labels.length ||
        scoring.order.some((label) => !labels.includes(label))
      ) {
        issues.push({
          code: "invalid-ordinal-scoring",
          questionId: question.id,
          message: "Ordinal questions require an ordered partial-credit scale matching every option",
        });
      }
    } else if (!isStatementSet && !isMostLeast && question.scoring !== undefined) {
      issues.push({
        code: "unexpected-scoring",
        questionId: question.id,
        message: "Only statement-set and ordinal questions can declare specialist scoring",
      });
    }

    if (!question.prompt.length || question.options.some((option) => !option.content.length)) {
      issues.push({
        code: "empty-content",
        questionId: question.id,
        message: "Prompt and option content are required",
      });
    }

    const blocks = [
      ...question.prompt,
      ...question.options.flatMap((option) => option.content),
      ...statements.flatMap((statement) => statement.content),
    ];
    if (
      paper.deliveryMode === "structured" &&
      blocks.some((block) => block.kind === "source-pdf")
    ) {
      issues.push({
        code: "structured-paper-pdf-block",
        questionId: question.id,
        message: "Structured papers cannot expose source PDF blocks",
      });
    }
    for (const block of blocks) {
      if (
        block.kind === "table" && (
          block.caption.trim() === "" ||
          block.headers.length === 0 ||
          block.headers.some((header) => header.trim() === "") ||
          block.rows.length === 0 ||
          block.rows.some((row) => row.length !== block.headers.length || row.some((cell) => cell.trim() === ""))
        )
      ) {
        issues.push({
          code: "invalid-data-table",
          questionId: question.id,
          message: "Data tables require a caption and a rectangular non-empty grid",
        });
      }
      if (block.kind === "figure" && !safeFigurePath.test(block.src)) {
        issues.push({
          code: "unsafe-figure-path",
          questionId: question.id,
          message: "Figures must use repository-owned SVG question assets",
        });
      }
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

    if (
      question.explanationResourceId !== undefined &&
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(question.explanationResourceId)
    ) {
      issues.push({
        code: "unsafe-explanation-resource",
        questionId: question.id,
        message: "Explanation resources must use stable content IDs",
      });
    }
  }

  return issues;
}
