import { ArrowRight, CalendarDays, Clock3, History, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import type { PracticeExamId } from "../catalog/assessment-registry.js";
import type { PracticeSession } from "../domain/session.js";
import { resolvePracticeDeliveryService } from "../delivery/resolve-service.js";
import {
  buildPracticeHistoryView,
  type PracticeHistoryMaterial,
  type PracticeHistoryView,
} from "../history/history-read-model.js";
import type { PracticeHistoryLoadResult } from "../history/store.js";

const examNames: Readonly<Record<PracticeExamId, string>> = {
  tmua: "TMUA",
  esat: "ESAT",
  tara: "TARA",
  lnat: "LNAT",
  ucat: "UCAT",
};

interface LearningRecordState {
  readonly loading: boolean;
  readonly history: PracticeHistoryLoadResult | null;
  readonly view: PracticeHistoryView | null;
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function mergeCurrent(
  history: PracticeHistoryLoadResult,
  current: PracticeSession | null,
): PracticeHistoryLoadResult {
  if (current === null || history.sessions.some((session) => session.id === current.id)) return history;
  return { ...history, sessions: [current, ...history.sessions] };
}

export function LearningRecordPage({
  examId,
  services,
}: {
  readonly examId: PracticeExamId;
  readonly services: AppServices;
}) {
  const [state, setState] = useState<LearningRecordState>({ loading: true, history: null, view: null });
  const name = examNames[examId];

  useEffect(() => {
    let active = true;
    void Promise.all([
      services.practiceHistory?.listRecent(30) ?? Promise.resolve({
        sessions: [], issue: null, scope: "device",
      } as const),
      services.store.loadCurrent(),
    ]).then(async ([history, current]) => {
      if (!active) return;
      const merged = mergeCurrent(history, current.session);
      const delivery = await resolvePracticeDeliveryService(services.practiceDelivery);
      const materialEntries = delivery === null ? [] : await Promise.all(
        merged.sessions.map(async (session): Promise<readonly [string, PracticeHistoryMaterial] | null> => {
          const exactPaper = await delivery.loadPaper(session.paperId, session.paperRevisionId).catch(() => null);
          const paper = exactPaper ?? await delivery.loadPaper(session.paperId).catch(() => null);
          if (paper === null) return null;
          const results = exactPaper === null || session.status === "active" || paper.responseMode === "essay"
            ? null
            : await delivery.score(session).catch(() => null);
          return [session.id, { paper, results }] as const;
        }),
      );
      if (!active) return;
      const materials = new Map(
        materialEntries.filter((entry): entry is readonly [string, PracticeHistoryMaterial] => entry !== null),
      );
      setState({
        loading: false,
        history: merged,
        view: buildPracticeHistoryView(merged.sessions, examId, services.now(), materials),
      });
    });
    return () => { active = false; };
  }, [examId, services]);

  if (state.loading || state.history === null || state.view === null) {
    return (
      <main className="learning-record-page">
        <SiteHeader examId={examId} />
        <section className="practice-state-page" aria-live="polite">
          <p className="eyebrow">LEARNING RECORD</p>
          <h1>Loading your {name} practice record…<small lang="zh-CN">正在读取你的练习记录</small></h1>
        </section>
      </main>
    );
  }
  const { history, view } = state;
  const sourceCopy = history.scope === "account"
    ? "These records come from your private account space and can be restored across signed-in devices."
    : history.scope === "device"
      ? "While signed out, the latest 30 complete practice snapshots stay in this browser. Sign in to restore them across devices."
      : "Some records have not synced to your account. The available copy is retained and its sync status is shown clearly.";

  return (
    <main className="learning-record-page">
      <SiteHeader examId={examId} />
      <section className="learning-record-hero page-shell">
        <div>
          <p className="eyebrow">YOUR PRACTICE RECORD</p>
          <h1>{name} Learning Record<span>Frequency, time, changes and results</span><small lang="zh-CN">练习记录</small></h1>
          <p>Your practice frequency, active time, answer changes, scores and topic tags show whether your training is becoming more consistent.</p>
        </div>
        <aside data-scope={history.scope}>
          <ShieldCheck aria-hidden="true" />
          <div><strong>{history.scope === "account" ? "Private account" : "This device"}</strong><p>{sourceCopy}</p></div>
        </aside>
      </section>

      {history.issue !== null && (
        <p className="learning-record-warning page-shell" role="status">
          Some records could not be loaded or synced. Only safely restored records are shown below.
        </p>
      )}

      <section className="learning-record-metrics page-shell" aria-label={`${name} learning record summary`}>
        <article><History aria-hidden="true" /><span>Saved practice</span><strong>{view.totalSessions}</strong><small>{view.completedSessions} completed</small></article>
        <article><CalendarDays aria-hidden="true" /><span>Last 30 days</span><strong>{view.activeDaysLast30} days</strong><small>{view.sessionsLast30} sessions</small></article>
        <article><Clock3 aria-hidden="true" /><span>Total active time</span><strong>{formatDuration(view.totalActiveMs)}</strong><small>Active question-page time only</small></article>
        <article><RefreshCw aria-hidden="true" /><span>Answer changes</span><strong>{view.totalAnswerChanges}</strong><small>A change is not automatically an error</small></article>
      </section>

      {view.entries.length === 0 ? (
        <section className="learning-record-empty page-shell">
          <p className="eyebrow">NO PRACTICE RECORD YET</p>
          <h2>Your record appears after your first {name} paper<small lang="zh-CN">完成第一项在线练习后自动形成记录</small></h2>
          <p>Answers, changes, marks, active time per question and submitted results stay in one private session.</p>
          <Link className="button button--primary" to={`/exams/${examId}/past-papers`}>Open free practice<ArrowRight aria-hidden="true" /></Link>
        </section>
      ) : (
        <>
          <section className="learning-record-modules page-shell" aria-labelledby={`${examId}-record-modules`}>
            <header>
              <p className="eyebrow">MODULE PERFORMANCE</p>
              <h2 id={`${examId}-record-modules`}>Performance by module<small lang="zh-CN">按模块查看训练表现</small></h2>
              <span>Average raw accuracy uses submitted objective questions only. Writing is not auto-scored.</span>
            </header>
            <div>
              {view.modules.map((module) => (
                <article key={module.key}>
                  <p>{module.label}</p>
                  <dl>
                    <div><dt>Attempts</dt><dd>{module.attempts}</dd></div>
                    <div><dt>Completed</dt><dd>{module.completed}</dd></div>
                    <div><dt>Active time</dt><dd>{formatDuration(module.activeMs)}</dd></div>
                    <div><dt>Objective average</dt><dd>{module.averagePercentage === null ? "Not enough evidence" : `${module.averagePercentage}%`}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </section>

          {view.topics.length > 0 && (
            <section className="learning-record-topics page-shell" aria-labelledby={`${examId}-record-topics`}>
              <header>
                <p className="eyebrow">KNOWLEDGE PERFORMANCE</p>
                <h2 id={`${examId}-record-topics`}>Performance by topic<small lang="zh-CN">具体知识点的作答表现</small></h2>
                <span>Ordered by incorrect and partial-credit evidence. Only observed attempts are described.</span>
              </header>
              <div>
                {view.topics.map((topic) => (
                  <article key={topic.knowledgeTag}>
                    <h3>{topic.label}</h3>
                    <p>{topic.attemptedCount} attempted · {topic.correctCount} correct · {topic.partialCount} partial · {topic.incorrectCount} incorrect</p>
                    <span>Active time {formatDuration(topic.activeMs)}</span>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="learning-record-sessions page-shell" aria-labelledby={`${examId}-record-sessions`}>
            <header>
              <p className="eyebrow">RECENT SESSIONS</p>
              <h2 id={`${examId}-record-sessions`}>Recent sessions<small lang="zh-CN">最近练习</small></h2>
            </header>
            <ol>
              {view.entries.map((entry, index) => (
                <li key={entry.session.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><p>{entry.title}</p><h3>{entry.subtitle}</h3><small>{formatDate(entry.lastActivityAt)} · {entry.statusLabel}</small></div>
                  <dl>
                    <div><dt>Answered</dt><dd>{entry.answeredCount} / {entry.totalQuestions}</dd></div>
                    <div><dt>Active time</dt><dd>{formatDuration(entry.activeMs)}</dd></div>
                    <div><dt>{entry.essayWords === null ? "Raw result" : "Words"}</dt><dd>{entry.essayWords === null ? entry.score === null ? "Not submitted" : `${entry.score} / ${entry.maxScore}` : entry.essayWords}</dd></div>
                    <div><dt>Changes</dt><dd>{entry.answerChanges}</dd></div>
                  </dl>
                  {entry.resultHref === null
                    ? <Link to={entry.practiceHref}>Continue or restart<ArrowRight aria-hidden="true" /></Link>
                    : <Link to={entry.resultHref}>View result<ArrowRight aria-hidden="true" /></Link>}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </main>
  );
}
