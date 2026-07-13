import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Clock3,
  DatabaseZap,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { AppServices } from "../../../app/dependencies.js";
import { BrandMark } from "../components/BrandMark.js";
import { QuestionResultRow } from "../components/QuestionResultRow.js";
import { TMUA_2023_P1 } from "../content/tmua-2023-p1.js";
import {
  calculateResults,
  type PracticeResults,
} from "../domain/results.js";

interface ResultsPageProps {
  services: AppServices;
}

type ResultLoadState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "ready"; results: PracticeResults; eventCount: number };

function formatDuration(timeMs: number): string {
  const totalSeconds = Math.round(timeMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}分 ${String(seconds).padStart(2, "0")}秒`;
}

const topicNames: Record<string, string> = {
  integration: "积分",
  quadratics: "二次函数",
  "sequences-series": "数列与级数",
  "geometry-optimization": "几何优化",
  "binomial-expansion": "二项式展开",
  "exponentials-logarithms": "指数与对数",
  "trigonometry-geometry": "三角与几何",
  "trigonometric-equations": "三角方程",
  "numerical-integration": "数值积分",
  "function-transformations": "函数变换",
  "coordinate-geometry-circles": "圆与坐标几何",
  "cubic-functions": "三次函数",
  "exponentials-range": "指数函数值域",
  "coordinate-geometry": "坐标几何",
  "circle-sequences": "圆与数列",
  "geometric-series-probability": "等比级数与概率",
  "differential-equations": "微分方程",
  "function-range": "函数值域",
};

export function ResultsPage({ services }: ResultsPageProps) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<ResultLoadState>({ kind: "loading" });
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    let active = true;
    void services.store.loadCurrent().then((loaded) => {
      if (!active) return;
      const session = loaded.session;
      if (
        session === null ||
        session.id !== sessionId ||
        session.status === "active"
      ) {
        setState({ kind: "unavailable" });
        return;
      }
      setState({
        kind: "ready",
        results: calculateResults(TMUA_2023_P1, session),
        eventCount: session.events.length,
      });
    });
    return () => {
      active = false;
    };
  }, [services.store, sessionId]);

  async function restart() {
    setRestarting(true);
    await services.store.clearCurrent();
    navigate("/exams/tmua");
  }

  if (state.kind === "loading") {
    return (
      <main className="practice-state-page">
        <p className="eyebrow">CALCULATING EVIDENCE</p>
        <h1>正在整理这次练习…</h1>
      </main>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <main className="practice-state-page">
        <p className="eyebrow">RESULT NOT AVAILABLE</p>
        <h1>这份结果暂时不可用</h1>
        <p>只有当前设备中已经提交、且与你打开的地址一致的练习可以查看。</p>
        <Link className="button button--primary" to="/exams/tmua">返回练习首页</Link>
      </main>
    );
  }

  const { results, eventCount } = state;
  const attemptedCount = results.correctCount + results.incorrectCount;
  const attemptedTopics = results.topics
    .filter((topic) => topic.attemptedCount > 0)
    .sort((left, right) => right.activeMs - left.activeMs)
    .slice(0, 3);

  return (
    <div className="results-page">
      <header className="results-header page-shell">
        <BrandMark />
        <Link to="/exams/tmua" className="results-back-link">
          <ArrowLeft aria-hidden="true" />返回 TMUA 备考中心
        </Link>
      </header>

      <main>
        <section className="results-hero page-shell">
          <div className="results-hero__copy">
            <p className="eyebrow">YOUR SESSION · YOUR EVIDENCE</p>
            <h1>本次练习完成</h1>
            <p>这是基于本次作答和计时的事实记录。它不是能力定论，也不会用不足的样本制造排名。</p>
          </div>
          <div className="score-seal" aria-label={`得分 ${results.score} / ${results.totalQuestions}`}>
            <span>本次得分</span>
            <strong>{results.score} / {results.totalQuestions}</strong>
            <small>{results.percentage}%</small>
          </div>
        </section>

        <section className="result-metrics page-shell" aria-label="本次练习摘要">
          <article><span>正确</span><strong>正确 {results.correctCount}</strong></article>
          <article><span>错误</span><strong>错误 {results.incorrectCount}</strong></article>
          <article><span>未作答</span><strong>未作答 {results.unansweredCount}</strong></article>
          <article><span>活跃页内用时</span><strong>{formatDuration(results.totalActiveMs)}</strong></article>
        </section>

        <section className="result-insights page-shell">
          <article className="insight-card">
            <Clock3 aria-hidden="true" />
            <p>节奏证据</p>
            <h2>{attemptedCount > 0 ? `完成 ${attemptedCount} 道作答` : "本次尚未作答"}</h2>
            <span>仅统计页面可见且练习处于活动状态的时间</span>
          </article>
          <article className="insight-card">
            <BarChart3 aria-hidden="true" />
            <p>知识证据</p>
            <h2>{attemptedTopics.length > 0 ? topicNames[attemptedTopics[0]!.knowledgeTag] ?? attemptedTopics[0]!.knowledgeTag : "等待更多数据"}</h2>
            <span>这里只汇总本卷标签，不推断尚未被观察的能力。</span>
          </article>
          <article className="insight-card">
            <DatabaseZap aria-hidden="true" />
            <p>事件记录</p>
            <h2>{eventCount} 条学习事件</h2>
            <span>作答、修改、标记、浏览、计时与提交均带版本留存。</span>
          </article>
        </section>

        <section className="benchmark-note page-shell">
          <div><ShieldCheck aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">FAIR BENCHMARK</p>
            <h2>群体 Benchmark 样本积累中</h2>
            <p>在考试版本、备考阶段、样本量与置信度足够之前，我们不会展示百分位或训练时间承诺。</p>
          </div>
        </section>

        <section className="answer-review page-shell" aria-labelledby="answer-review-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ANSWER REVIEW</p>
              <h2 id="answer-review-title">逐题证据</h2>
            </div>
            <span>答案仅在提交后显示</span>
          </div>
          <div className="result-list">
            {results.questions.map((result, index) => (
              <QuestionResultRow
                key={result.questionId}
                result={result}
                question={TMUA_2023_P1.questions[index]!}
              />
            ))}
          </div>
        </section>

        <section className="result-actions page-shell">
          <button
            className="button button--primary"
            type="button"
            disabled={restarting}
            onClick={() => void restart()}
          >
            <RefreshCw aria-hidden="true" />
            {restarting ? "正在重置…" : "重新练习这份试卷"}
          </button>
          <p>重新开始会清除当前设备上的这次会话；题目内容不会受影响。</p>
        </section>
      </main>
    </div>
  );
}
