import type { PracticePaper, PracticeQuestion } from "../content/types.js";
import type { PracticeSession } from "./session.js";
import { statementSetCorrectCount, statementSetIsComplete } from "./statement-response.js";
import { mostLeastAnswerIsComplete, parseMostLeastAnswer } from "./most-least-response.js";

export type QuestionResultStatus = "correct" | "partial" | "incorrect" | "unanswered";

export interface QuestionResult {
  questionId: string;
  number: number;
  selectedAnswer: string | null;
  correctAnswer: string;
  statementCorrectAnswers?: Readonly<Record<string, "yes" | "no">>;
  status: QuestionResultStatus;
  points: number;
  maxPoints: number;
  timeMs: number;
  marked: boolean;
  knowledgeTags: readonly string[];
  skillTags: readonly string[];
}

export interface TopicResult {
  knowledgeTag: string;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  activeMs: number;
}

export interface PracticeResults {
  sessionId: PracticeSession["id"];
  score: number;
  maxScore: number;
  totalQuestions: number;
  percentage: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalActiveMs: number;
  averagePerQuestionMs: number;
  longestQuestionIds: readonly string[];
  questions: readonly QuestionResult[];
  topics: readonly TopicResult[];
}

function scoreQuestion(
  question: PracticeQuestion,
  selectedAnswer: string | undefined,
): { status: QuestionResultStatus; points: number; maxPoints: number } {
  if (selectedAnswer === undefined) {
    return {
      status: "unanswered",
      points: 0,
      maxPoints: question.scoring?.kind === "statement-set-two-point" ? 2 : 1,
    };
  }

  if (question.responseMode === "statement-set") {
    const statements = question.statements ?? [];
    const complete = statementSetIsComplete(statements, selectedAnswer);
    const correctStatements = statementSetCorrectCount(statements, selectedAnswer);
    const points = complete && correctStatements === statements.length
      ? 2
      : complete && correctStatements === statements.length - 1
        ? 1
        : 0;
    return { status: points === 2 ? "correct" : points === 1 ? "partial" : "incorrect", points, maxPoints: 2 };
  }

  if (question.responseMode === "most-least-choice") {
    const selected = parseMostLeastAnswer(selectedAnswer);
    const correct = parseMostLeastAnswer(question.correctAnswer);
    const complete = mostLeastAnswerIsComplete(selectedAnswer);
    const points = complete && selected.most === correct.most && selected.least === correct.least ? 1 : 0;
    return { status: points === 1 ? "correct" : "incorrect", points, maxPoints: 1 };
  }

  if (question.scoring?.kind === "adjacent-partial") {
    const selectedIndex = question.scoring.order.indexOf(selectedAnswer);
    const correctIndex = question.scoring.order.indexOf(question.correctAnswer);
    const distance = selectedIndex < 0 || correctIndex < 0 ? Number.POSITIVE_INFINITY : Math.abs(selectedIndex - correctIndex);
    const points = distance === 0 ? 1 : distance === 1 ? 0.5 : 0;
    return { status: points === 1 ? "correct" : points === 0.5 ? "partial" : "incorrect", points, maxPoints: 1 };
  }

  const points = selectedAnswer === question.correctAnswer ? 1 : 0;
  return { status: points === 1 ? "correct" : "incorrect", points, maxPoints: 1 };
}

export function calculateResults(
  paper: PracticePaper,
  session: PracticeSession,
): PracticeResults {
  if (session.status === "active") {
    throw new Error("Results cannot be calculated for an active session");
  }
  if (paper.id !== session.paperId) {
    throw new Error("Practice session and paper do not match");
  }

  const questions: QuestionResult[] = paper.questions.map((question) => {
    const selectedAnswer = session.answers[question.id];
    const score = scoreQuestion(question, selectedAnswer);
    return {
      questionId: question.id,
      number: question.number,
      selectedAnswer: selectedAnswer ?? null,
      correctAnswer: question.correctAnswer,
      ...(question.responseMode === "statement-set"
        ? {
            statementCorrectAnswers: Object.fromEntries(
              (question.statements ?? []).map((statement) => [statement.id, statement.correctAnswer]),
            ),
          }
        : {}),
      ...score,
      timeMs: session.timingByQuestionMs[question.id] ?? 0,
      marked: session.markedQuestionIds.includes(question.id),
      knowledgeTags: question.knowledgeTags,
      skillTags: question.skillTags,
    };
  });

  const correctCount = questions.filter(
    (question) => question.status === "correct",
  ).length;
  const partialCount = questions.filter(
    (question) => question.status === "partial",
  ).length;
  const incorrectCount = questions.filter(
    (question) => question.status === "incorrect",
  ).length;
  const unansweredCount = questions.filter(
    (question) => question.status === "unanswered",
  ).length;
  const totalActiveMs = questions.reduce(
    (total, question) => total + question.timeMs,
    0,
  );

  const topicMap = new Map<string, TopicResult>();
  for (const question of questions) {
    for (const knowledgeTag of question.knowledgeTags) {
      const current = topicMap.get(knowledgeTag) ?? {
        knowledgeTag,
        totalQuestions: 0,
        attemptedCount: 0,
        correctCount: 0,
        activeMs: 0,
      };
      current.totalQuestions += 1;
      current.attemptedCount += question.status === "unanswered" ? 0 : 1;
      current.correctCount += question.status === "correct" ? 1 : 0;
      current.activeMs += question.timeMs;
      topicMap.set(knowledgeTag, current);
    }
  }

  const score = questions.reduce((total, question) => total + question.points, 0);
  const maxScore = questions.reduce((total, question) => total + question.maxPoints, 0);

  return {
    sessionId: session.id,
    score,
    maxScore,
    totalQuestions: questions.length,
    percentage:
      questions.length === 0
        ? 0
        : Math.round((score / maxScore) * 1_000) / 10,
    correctCount,
    partialCount,
    incorrectCount,
    unansweredCount,
    totalActiveMs,
    averagePerQuestionMs:
      questions.length === 0 ? 0 : Math.round(totalActiveMs / questions.length),
    longestQuestionIds: [...questions]
      .filter((question) => question.timeMs > 0)
      .sort(
        (left, right) =>
          right.timeMs - left.timeMs || left.number - right.number,
      )
      .slice(0, 3)
      .map((question) => question.questionId),
    questions,
    topics: [...topicMap.values()],
  };
}
