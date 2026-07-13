import type { PracticePaper } from "../content/types.js";
import type { PracticeSession } from "./session.js";

export type QuestionResultStatus = "correct" | "incorrect" | "unanswered";

export interface QuestionResult {
  questionId: string;
  number: number;
  selectedAnswer: string | null;
  correctAnswer: string;
  status: QuestionResultStatus;
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
  totalQuestions: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalActiveMs: number;
  averagePerQuestionMs: number;
  longestQuestionIds: readonly string[];
  questions: readonly QuestionResult[];
  topics: readonly TopicResult[];
}

function statusFor(
  selectedAnswer: string | undefined,
  correctAnswer: string,
): QuestionResultStatus {
  if (selectedAnswer === undefined) {
    return "unanswered";
  }
  return selectedAnswer === correctAnswer ? "correct" : "incorrect";
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
    return {
      questionId: question.id,
      number: question.number,
      selectedAnswer: selectedAnswer ?? null,
      correctAnswer: question.correctAnswer,
      status: statusFor(selectedAnswer, question.correctAnswer),
      timeMs: session.timingByQuestionMs[question.id] ?? 0,
      marked: session.markedQuestionIds.includes(question.id),
      knowledgeTags: question.knowledgeTags,
      skillTags: question.skillTags,
    };
  });

  const correctCount = questions.filter(
    (question) => question.status === "correct",
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

  return {
    sessionId: session.id,
    score: correctCount,
    totalQuestions: questions.length,
    percentage:
      questions.length === 0
        ? 0
        : Math.round((correctCount / questions.length) * 1_000) / 10,
    correctCount,
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
