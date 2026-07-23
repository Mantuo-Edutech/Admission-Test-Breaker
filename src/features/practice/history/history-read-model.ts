import type { PracticeExamId } from "../catalog/assessment-registry.js";
import { knowledgeTagLabel } from "../content/knowledge-tag-taxonomy.js";
import { practicePaperPresentation } from "../content/practice-paper-presentation.js";
import { sessionContentMatchesPaper } from "../content/published-revisions.js";
import { countEssayWords, parseEssayResponse } from "../domain/essay-response.js";
import type { PracticeResults } from "../domain/results.js";
import type { PracticeSession } from "../domain/session.js";
import type { DeliveredPracticePaper } from "../delivery/domain.js";

export interface PracticeHistoryMaterial {
  readonly paper: DeliveredPracticePaper;
  readonly results: PracticeResults | null;
}

export interface PracticeHistoryEntry {
  readonly session: PracticeSession;
  readonly examId: PracticeExamId;
  readonly examName: string;
  readonly title: string;
  readonly subtitle: string;
  readonly statusLabel: string;
  readonly lastActivityAt: string;
  readonly answeredCount: number;
  readonly totalQuestions: number;
  readonly activeMs: number;
  readonly answerChanges: number;
  readonly score: number | null;
  readonly maxScore: number | null;
  readonly percentage: number | null;
  readonly essayWords: number | null;
  readonly resultHref: string | null;
  readonly practiceHref: string;
  readonly moduleKey: string;
  readonly contentAvailable: boolean;
}

export interface PracticeModuleEvidence {
  readonly key: string;
  readonly label: string;
  readonly attempts: number;
  readonly completed: number;
  readonly activeMs: number;
  readonly averagePercentage: number | null;
}

export interface PracticeTopicEvidence {
  readonly knowledgeTag: string;
  readonly label: string;
  readonly attemptedCount: number;
  readonly correctCount: number;
  readonly partialCount: number;
  readonly incorrectCount: number;
  readonly activeMs: number;
}

export interface PracticeHistoryView {
  readonly examId: PracticeExamId;
  readonly entries: readonly PracticeHistoryEntry[];
  readonly totalSessions: number;
  readonly completedSessions: number;
  readonly activeDaysLast30: number;
  readonly sessionsLast30: number;
  readonly totalActiveMs: number;
  readonly totalAnswerChanges: number;
  readonly modules: readonly PracticeModuleEvidence[];
  readonly topics: readonly PracticeTopicEvidence[];
}

function lastActivityAt(session: PracticeSession): string {
  return session.events.at(-1)?.occurredAt ?? session.startedAt;
}

function totalActiveMs(session: PracticeSession): number {
  return Object.values(session.timingByQuestionMs).reduce((sum, duration) => sum + duration, 0);
}

function essayWords(session: PracticeSession): number {
  return Object.values(session.answers).reduce(
    (sum, answer) => sum + countEssayWords(parseEssayResponse(answer).text),
    0,
  );
}

function objectiveResults(
  session: PracticeSession,
  materials: ReadonlyMap<string, PracticeHistoryMaterial>,
): PracticeResults | null {
  if (session.status === "active") return null;
  const material = materials.get(session.id);
  if (
    material === undefined ||
    !sessionContentMatchesPaper(session, material.paper) ||
    material.paper.responseMode === "essay"
  ) return null;
  return material.results;
}

function entryFromSession(
  session: PracticeSession,
  materials: ReadonlyMap<string, PracticeHistoryMaterial>,
): PracticeHistoryEntry | null {
  const paper = materials.get(session.id)?.paper;
  if (paper === undefined) return null;
  const contentAvailable = sessionContentMatchesPaper(session, paper);
  const presentation = practicePaperPresentation(paper);
  const results = objectiveResults(session, materials);
  const words = paper.responseMode === "essay" ? essayWords(session) : null;
  const answeredCount = paper.responseMode === "essay"
    ? (words ?? 0) > 0 ? 1 : 0
    : Object.keys(session.answers).length;
  return {
    session,
    examId: presentation.examId,
    examName: presentation.examName,
    title: presentation.title,
    subtitle: presentation.subtitle,
    statusLabel: !contentAvailable
      ? "原内容版本待恢复"
      : session.status === "active" ? "进行中" : session.status === "submitted" ? "已提交" : "已到时提交",
    lastActivityAt: lastActivityAt(session),
    answeredCount,
    totalQuestions: paper.responseMode === "essay" ? 1 : paper.questions.length,
    activeMs: totalActiveMs(session),
    answerChanges: session.events.filter((event) => event.type === "answer_changed").length,
    score: results?.score ?? null,
    maxScore: results?.maxScore ?? null,
    percentage: results?.percentage ?? null,
    essayWords: words,
    resultHref: session.status === "active" || !contentAvailable ? null : `/results/${session.id}`,
    practiceHref: `/practice/${paper.id}`,
    moduleKey: paper.sectionId ?? `${paper.exam.toLowerCase()}-${paper.paper ?? paper.edition}`,
    contentAvailable,
  };
}

export function buildPracticeHistoryView(
  sessions: readonly PracticeSession[],
  examId: PracticeExamId,
  now: Date,
  materials: ReadonlyMap<string, PracticeHistoryMaterial> = new Map(),
): PracticeHistoryView {
  if (!Number.isFinite(now.getTime())) throw new Error("Practice history requires a valid current time");
  const entries = sessions
    .map((session) => entryFromSession(session, materials))
    .filter((entry): entry is PracticeHistoryEntry => entry !== null && entry.examId === examId)
    .sort((left, right) => Date.parse(right.lastActivityAt) - Date.parse(left.lastActivityAt));
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1_000;
  const recent = entries.filter((entry) => Date.parse(entry.lastActivityAt) >= thirtyDaysAgo);

  const moduleMap = new Map<string, {
    label: string;
    attempts: number;
    completed: number;
    activeMs: number;
    percentages: number[];
  }>();
  const topicMap = new Map<string, PracticeTopicEvidence>();
  for (const entry of entries) {
    const module = moduleMap.get(entry.moduleKey) ?? {
      label: entry.subtitle,
      attempts: 0,
      completed: 0,
      activeMs: 0,
      percentages: [],
    };
    module.attempts += 1;
    module.completed += entry.session.status === "active" ? 0 : 1;
    module.activeMs += entry.activeMs;
    if (entry.percentage !== null) module.percentages.push(entry.percentage);
    moduleMap.set(entry.moduleKey, module);

    const results = objectiveResults(entry.session, materials);
    for (const question of results?.questions ?? []) {
      if (question.status === "unanswered") continue;
      for (const knowledgeTag of question.knowledgeTags) {
        const current = topicMap.get(knowledgeTag) ?? {
          knowledgeTag,
          label: knowledgeTagLabel(knowledgeTag),
          attemptedCount: 0,
          correctCount: 0,
          partialCount: 0,
          incorrectCount: 0,
          activeMs: 0,
        };
        topicMap.set(knowledgeTag, {
          ...current,
          attemptedCount: current.attemptedCount + 1,
          correctCount: current.correctCount + (question.status === "correct" ? 1 : 0),
          partialCount: current.partialCount + (question.status === "partial" ? 1 : 0),
          incorrectCount: current.incorrectCount + (question.status === "incorrect" ? 1 : 0),
          activeMs: current.activeMs + question.timeMs,
        });
      }
    }
  }

  return {
    examId,
    entries,
    totalSessions: entries.length,
    completedSessions: entries.filter((entry) => entry.session.status !== "active").length,
    activeDaysLast30: new Set(recent.map((entry) => entry.lastActivityAt.slice(0, 10))).size,
    sessionsLast30: recent.length,
    totalActiveMs: entries.reduce((sum, entry) => sum + entry.activeMs, 0),
    totalAnswerChanges: entries.reduce((sum, entry) => sum + entry.answerChanges, 0),
    modules: [...moduleMap.entries()].map(([key, value]) => ({
      key,
      label: value.label,
      attempts: value.attempts,
      completed: value.completed,
      activeMs: value.activeMs,
      averagePercentage: value.percentages.length === 0
        ? null
        : Math.round((value.percentages.reduce((sum, percentage) => sum + percentage, 0) / value.percentages.length) * 10) / 10,
    })),
    topics: [...topicMap.values()]
      .sort((left, right) =>
        (right.incorrectCount + right.partialCount) - (left.incorrectCount + left.partialCount) ||
        right.attemptedCount - left.attemptedCount ||
        left.knowledgeTag.localeCompare(right.knowledgeTag),
      )
      .slice(0, 8),
  };
}
