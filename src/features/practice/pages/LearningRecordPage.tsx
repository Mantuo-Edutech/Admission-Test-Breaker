import { ArrowRight, CalendarDays, Clock3, History, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import type { PracticeExamId } from "../catalog/assessment-registry.js";
import { loadPracticePaper } from "../content/practice-paper-registry.js";
import type { PracticeSession } from "../domain/session.js";
import {
  buildPracticeHistoryView,
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
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} 小时` : `${hours} 小时 ${remainder} 分`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
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
      await Promise.all(merged.sessions.map((session) => loadPracticePaper(session.paperId)));
      if (!active) return;
      setState({
        loading: false,
        history: merged,
        view: buildPracticeHistoryView(merged.sessions, examId, services.now()),
      });
    });
    return () => { active = false; };
  }, [examId, services]);

  if (state.loading || state.history === null || state.view === null) {
    return (
      <main className="learning-record-page">
        <SiteHeader examId={examId} />
        <section className="practice-state-page" aria-live="polite">
          <p className="eyebrow">正在整理本人记录 · LEARNING RECORD</p>
          <h1>正在读取你的 {name} 练习证据…</h1>
        </section>
      </main>
    );
  }
  const { history, view } = state;
  const sourceCopy = history.scope === "account"
    ? "这些记录来自你本人账号的私密学习空间，可在登录设备间恢复。"
    : history.scope === "device"
      ? "未登录时，最近 30 次完整练习快照只保存在当前浏览器；注册登录后才能跨设备恢复。"
      : "部分记录尚未同步到本人账号；系统保留当前可读取副本，并明确显示同步状态。";

  return (
    <main className="learning-record-page">
      <SiteHeader examId={examId} />
      <section className="learning-record-hero page-shell">
        <div>
          <p className="eyebrow">YOUR PRACTICE RECORD · 你的真实学习证据</p>
          <h1>{name} 学习记录<span>Frequency, time, changes and results</span></h1>
          <p>这里只汇总已经保存的作答事实：练习频率、活跃用时、改答、原始结果和知识标签。没有足够样本时，不生成排名、能力定论或训练时长承诺。</p>
        </div>
        <aside data-scope={history.scope}>
          <ShieldCheck aria-hidden="true" />
          <div><strong>{history.scope === "account" ? "本人账号 · Private account" : "当前设备 · This device"}</strong><p>{sourceCopy}</p></div>
        </aside>
      </section>

      {history.issue !== null && (
        <p className="learning-record-warning page-shell" role="status">
          部分记录暂时无法读取或同步；下面只展示已经安全恢复的内容。
        </p>
      )}

      <section className="learning-record-metrics page-shell" aria-label={`${name} 学习记录概览`}>
        <article><History aria-hidden="true" /><span>已保存练习</span><strong>{view.totalSessions}</strong><small>完成 {view.completedSessions} 次</small></article>
        <article><CalendarDays aria-hidden="true" /><span>近 30 天频率</span><strong>{view.activeDaysLast30} 天</strong><small>{view.sessionsLast30} 次练习</small></article>
        <article><Clock3 aria-hidden="true" /><span>累计活跃用时</span><strong>{formatDuration(view.totalActiveMs)}</strong><small>只计题目页面活跃时间</small></article>
        <article><RefreshCw aria-hidden="true" /><span>改答记录</span><strong>{view.totalAnswerChanges} 次</strong><small>不把改答自动判为错误</small></article>
      </section>

      {view.entries.length === 0 ? (
        <section className="learning-record-empty page-shell">
          <p className="eyebrow">NO SAVED EVIDENCE YET</p>
          <h2>完成第一项 {name} 在线练习后，这里会自动形成记录</h2>
          <p>答题、改答、标记、每题活跃用时和提交结果都会进入同一份私密会话。</p>
          <Link className="button button--primary" to={`/exams/${examId}/past-papers`}>进入免费在线练习<ArrowRight aria-hidden="true" /></Link>
        </section>
      ) : (
        <>
          <section className="learning-record-modules page-shell" aria-labelledby={`${examId}-record-modules`}>
            <header>
              <p className="eyebrow">MODULE EVIDENCE</p>
              <h2 id={`${examId}-record-modules`}>按模块查看已积累的证据</h2>
              <span>平均原始正确率只汇总已提交的客观题；写作不生成自动分数。</span>
            </header>
            <div>
              {view.modules.map((module) => (
                <article key={module.key}>
                  <p>{module.label}</p>
                  <dl>
                    <div><dt>练习</dt><dd>{module.attempts} 次</dd></div>
                    <div><dt>完成</dt><dd>{module.completed} 次</dd></div>
                    <div><dt>活跃时间</dt><dd>{formatDuration(module.activeMs)}</dd></div>
                    <div><dt>客观题平均</dt><dd>{module.averagePercentage === null ? "暂无合格样本" : `${module.averagePercentage}%`}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </section>

          {view.topics.length > 0 && (
            <section className="learning-record-topics page-shell" aria-labelledby={`${examId}-record-topics`}>
              <header>
                <p className="eyebrow">KNOWLEDGE EVIDENCE</p>
                <h2 id={`${examId}-record-topics`}>具体知识标签的作答事实</h2>
                <span>按错答与部分得分数量优先排列，只说明已经出现的样本。</span>
              </header>
              <div>
                {view.topics.map((topic) => (
                  <article key={topic.knowledgeTag}>
                    <h3>{topic.label}</h3>
                    <p>{topic.attemptedCount} 题已作答 · 正确 {topic.correctCount} · 部分得分 {topic.partialCount} · 错答 {topic.incorrectCount}</p>
                    <span>活跃用时 {formatDuration(topic.activeMs)}</span>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="learning-record-sessions page-shell" aria-labelledby={`${examId}-record-sessions`}>
            <header>
              <p className="eyebrow">RECENT SESSIONS</p>
              <h2 id={`${examId}-record-sessions`}>最近练习</h2>
            </header>
            <ol>
              {view.entries.map((entry, index) => (
                <li key={entry.session.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><p>{entry.title}</p><h3>{entry.subtitle}</h3><small>{formatDate(entry.lastActivityAt)} · {entry.statusLabel}</small></div>
                  <dl>
                    <div><dt>作答</dt><dd>{entry.answeredCount} / {entry.totalQuestions}</dd></div>
                    <div><dt>活跃用时</dt><dd>{formatDuration(entry.activeMs)}</dd></div>
                    <div><dt>{entry.essayWords === null ? "原始结果" : "字数"}</dt><dd>{entry.essayWords === null ? entry.score === null ? "尚未提交" : `${entry.score} / ${entry.maxScore}` : `${entry.essayWords} 词`}</dd></div>
                    <div><dt>改答</dt><dd>{entry.answerChanges} 次</dd></div>
                  </dl>
                  {entry.resultHref === null
                    ? <Link to={entry.practiceHref}>继续或重新开始<ArrowRight aria-hidden="true" /></Link>
                    : <Link to={entry.resultHref}>查看本次结果<ArrowRight aria-hidden="true" /></Link>}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </main>
  );
}
