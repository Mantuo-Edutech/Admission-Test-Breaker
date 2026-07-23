import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Clock3,
  DatabaseZap,
  RefreshCw,
  ShieldCheck,
  LockKeyhole,
  UnlockKeyhole,
} from "lucide-react";
import type { AppServices } from "../../../app/dependencies.js";
import type {
  TmuaSpecimenP1WorkedExplanations,
  WorkedExplanation,
} from "../../entitled-content/domain.js";
import { BrandMark } from "../../navigation/components/BrandMark.js";
import { QuestionResultRow } from "../components/QuestionResultRow.js";
import { loadPracticePaper, practicePaperPresentation } from "../content/practice-paper-registry.js";
import type { PracticePaper } from "../content/types.js";
import {
  calculateResults,
  type PracticeResults,
} from "../domain/results.js";
import type { PracticeSession } from "../domain/session.js";
import { countEssayWords, parseEssayResponse } from "../domain/essay-response.js";
import { buildFeedbackHref, normalizeFeedbackContext } from "../../feedback/domain.js";
import { ESAT_KNOWLEDGE_UNITS } from "../../catalog/esat-plan.js";
import { reviewContentProductsForPractice } from "../../library/content-product-registry.js";
import { WechatAccessDialog } from "../../service-bridge/components/WechatAccessDialog.js";
import type { ProductFunnelExamId } from "../../product-funnel/domain.js";

interface ResultsPageProps {
  services: AppServices;
}

type ResultLoadState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "ready"; results: PracticeResults | null; eventCount: number; paper: PracticePaper; session: PracticeSession };

type DeepReviewState =
  | { readonly kind: "unavailable" }
  | { readonly kind: "loading" }
  | { readonly kind: "unauthenticated" }
  | { readonly kind: "locked" }
  | {
      readonly kind: "error";
      readonly reason: "mapping" | "service" | "payload";
      readonly message: string;
    }
  | {
      readonly kind: "available";
      readonly payload: TmuaSpecimenP1WorkedExplanations;
      readonly byQuestionId: ReadonlyMap<string, WorkedExplanation>;
    };

function formatDuration(timeMs: number): string {
  const totalSeconds = Math.round(timeMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}分 ${String(seconds).padStart(2, "0")}秒`;
}

const esatTopicNames = Object.fromEntries(
  Object.values(ESAT_KNOWLEDGE_UNITS).flat().map((unit) => [unit.id, `${unit.labelEn} · ${unit.label}`]),
);

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
  "tara-critical-main-conclusion": "Main conclusion · 主结论",
  "tara-critical-assumption": "Assumption · 必要假设",
  "tara-critical-flaw": "Flaw · 推理缺陷",
  "tara-critical-evidence": "Evidence · 证据评估",
  "tara-critical-inference": "Inference · 必然推论",
  "tara-problem-ordering": "Ordering · 顺序安排",
  "tara-problem-constraints": "Constraints · 条件约束",
  "tara-problem-arithmetic": "Arithmetic modelling · 数量建模",
  "tara-problem-sets": "Sets · 集合关系",
  "tara-problem-rates": "Rates · 速率问题",
  "lnat-main-conclusion": "Main conclusion · 主结论",
  "lnat-argument-role": "Argument role · 论证作用",
  "lnat-inference": "Inference · 文本推论",
  "lnat-strengthen": "Strengthen · 加强论证",
  "lnat-recommendation": "Recommendation · 政策建议",
  "lnat-sampling-bias": "Sampling bias · 样本偏差",
  "lnat-evidence-evaluation": "Evidence evaluation · 证据评估",
  "lnat-context-meaning": "Meaning in context · 语境含义",
  "lnat-principle": "Principle · 原则提炼",
  "lnat-evidence-limit": "Evidence limits · 证据边界",
  "lnat-qualification": "Qualified claim · 限定主张",
  "lnat-analogy": "Analogy · 类比迁移",
  "ucat-vr-explicit-information": "Explicit information · 明确信息",
  "ucat-vr-contradiction": "Contradiction · 文本矛盾",
  "ucat-vr-insufficient-information": "Can't Tell · 信息不足",
  "ucat-vr-conclusion": "Supported conclusion · 支持结论",
  "ucat-vr-quantity-check": "Quantity check · 数量核对",
  "ucat-vr-inference": "Safe inference · 安全推论",
  "ucat-vr-future-claim": "Future claim · 未来主张",
  "ucat-vr-summary": "Summary · 文本概括",
  "ucat-vr-comparison": "Comparison · 比较关系",
  "ucat-vr-proportion": "Proportion · 比例核对",
  "ucat-vr-extrapolation": "Extrapolation · 外推边界",
  "ucat-vr-study-limit": "Study limits · 研究边界",
  "ucat-qr-percentage-decrease": "Percentage decrease · 百分比减少",
  "ucat-qr-time-conversion": "Time conversion · 时间换算",
  "ucat-qr-percentage-increase": "Percentage increase · 百分比增加",
  "ucat-qr-inventory-balance": "Inventory balance · 库存平衡",
  "ucat-qr-percentage-of-total": "Percentage of total · 占比",
  "ucat-qr-multi-step-cost": "Multi-step cost · 多步成本",
  "ucat-qr-speed": "Speed · 速度",
  "ucat-qr-rate-per-time": "Rate per time · 单位时间比率",
  "ucat-qr-weighted-percentage": "Combined percentage · 合并百分比",
  "ucat-qr-percentage-points": "Percentage points · 百分点",
  "ucat-dm-ordering": "Ordering · 顺序安排",
  "ucat-dm-deduction": "Deduction · 逻辑推导",
  "ucat-dm-bayes-table": "Natural-frequency probability · 自然频数概率",
  "ucat-dm-syllogisms": "Syllogisms · 三段论判断",
  "ucat-dm-venn-counting": "Set counting · 集合计数",
  "ucat-dm-strongest-argument": "Strongest argument · 最强论证",
  "ucat-dm-data-inference": "Data inference · 数据推断",
  "ucat-dm-probability": "Probability · 概率判断",
  "ucat-sjt-record-integrity": "Record integrity · 记录完整性",
  "ucat-sjt-patient-safety": "Patient safety · 患者安全",
  "ucat-sjt-confidentiality": "Confidentiality · 保密责任",
  "ucat-sjt-speaking-up": "Speaking up · 主动报告",
  "ucat-sjt-access-boundary": "Access boundaries · 信息访问边界",
  "ucat-sjt-boundaries": "Professional boundaries · 专业边界",
  "ucat-sjt-disclosure": "Disclosure · 信息披露",
  "ucat-sjt-respect": "Respect · 尊重与职业行为",
  "ucat-sjt-teamwork": "Teamwork · 团队协作",
  "ucat-sjt-constructive-action": "Constructive action · 建设性行动",
  ...esatTopicNames,
};

interface EssayResultViewProps {
  paper: PracticePaper;
  session: PracticeSession;
  eventCount: number;
  restarting: boolean;
  onRestart(): void;
}

function EssayResultView({ paper, session, eventCount, restarting, onRestart }: EssayResultViewProps) {
  const presentation = practicePaperPresentation(paper);
  const question = paper.questions[0]!;
  const response = parseEssayResponse(session.answers[question.id]);
  const selectedPrompt = paper.essayTask?.prompts.find((prompt) => prompt.id === response.promptId);
  const wordCount = countEssayWords(response.text);
  const totalActiveMs = session.timingByQuestionMs[question.id] ?? 0;

  return (
    <div className="results-page essay-results-page">
      <header className="results-header page-shell">
        <BrandMark />
        <Link to={presentation.backHref} className="results-back-link">
          <ArrowLeft aria-hidden="true" />返回 {paper.exam} 练习目录
        </Link>
      </header>
      <main>
        <section className="results-hero page-shell">
          <div className="results-hero__copy">
            <p className="eyebrow">WRITING SUBMITTED · YOUR DRAFT</p>
            <h1>写作已经保存并提交</h1>
            <p>基础结果只陈述题目、字数与活跃用时，不用未经复核的模型制造分数。人工批改与 AI 解读可以在后续按学生授权接入。</p>
          </div>
          <div className="score-seal" aria-label={`写作字数 ${wordCount}`}>
            <span>本次字数</span>
            <strong>{wordCount}</strong>
            <small>words</small>
          </div>
        </section>

        <section className="result-metrics page-shell" aria-label="本次写作摘要">
          <article><span>选择题目</span><strong>{selectedPrompt?.title ?? "未选择"}</strong></article>
          <article><span>写作字数</span><strong>{wordCount} 词</strong></article>
          <article><span>活跃页内用时</span><strong>{formatDuration(totalActiveMs)}</strong></article>
          <article><span>学习事件</span><strong>{eventCount} 条</strong></article>
        </section>

        <section className="essay-submission-review page-shell" aria-labelledby="essay-submission-title">
          <header>
            <p className="eyebrow">SUBMITTED RESPONSE</p>
            <h2 id="essay-submission-title">{selectedPrompt?.prompt ?? "本次没有选择写作题目"}</h2>
          </header>
          <div>{response.text.trim() === "" ? "本次没有写入正文。" : response.text}</div>
          <p><ShieldCheck aria-hidden="true" />正文只保存在当前学生的学习空间；平台不会把它公开展示或用于未经授权的训练。</p>
        </section>

        <section className="benchmark-note page-shell">
          <div><ShieldCheck aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">HONEST FEEDBACK BOUNDARY</p>
            <h2>当前不生成自动写作分数</h2>
            <p>正式反馈需要明确 rubric、独立教师标定、版本记录与学生授权。邀请码未来只解锁真实已发布的批改服务，不影响免费写作与正文取回。</p>
          </div>
        </section>

        <section className="result-actions page-shell">
          <button className="button button--primary" type="button" disabled={restarting} onClick={onRestart}>
            <RefreshCw aria-hidden="true" />{restarting ? "正在重置…" : "重新完成这项写作"}
          </button>
          <p>重新开始会创建新的限时写作；已经提交的正文不会被改写。</p>
        </section>
      </main>
    </div>
  );
}

export function ResultsPage({ services }: ResultsPageProps) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<ResultLoadState>({ kind: "loading" });
  const [restarting, setRestarting] = useState(false);
  const [deepReview, setDeepReview] = useState<DeepReviewState>({ kind: "unavailable" });
  const [wechatOpen, setWechatOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const loaded = await services.store.loadCurrent();
      if (!active) return;
      let session = loaded.session;
      if (session?.id !== sessionId && services.practiceHistory !== undefined) {
        const history = await services.practiceHistory.listRecent(100);
        session = history.sessions.find((candidate) => candidate.id === sessionId) ?? null;
      }
      if (!active) return;
      if (
        session === null ||
        session.id !== sessionId ||
        session.status === "active"
      ) {
        setState({ kind: "unavailable" });
        return;
      }
      const paper = await loadPracticePaper(session.paperId);
      if (!active) return;
      if (paper === null) {
        setState({ kind: "unavailable" });
        return;
      }
      setState({
        kind: "ready",
        results: paper.responseMode === "essay" ? null : calculateResults(paper, session),
        eventCount: session.events.length,
        paper,
        session,
      });
    })();
    return () => {
      active = false;
    };
  }, [services.store, sessionId]);

  useEffect(() => {
    if (state.kind !== "ready") return;
    const reviewProducts = reviewContentProductsForPractice(state.paper.id).filter(
      (product) => product.access === "invite",
    );
    const resourceIds = new Set(
      state.paper.questions
        .map((question) => question.explanationResourceId)
        .filter((resourceId): resourceId is string => resourceId !== undefined),
    );
    if (resourceIds.size === 0 && reviewProducts.length === 0) {
      setDeepReview({ kind: "unavailable" });
      return;
    }
    if (
      reviewProducts.length !== 1 ||
      resourceIds.size !== 1 ||
      state.paper.questions.some((question) => question.explanationResourceId === undefined)
    ) {
      setDeepReview({
        kind: "error",
        reason: "mapping",
        message: "本卷解析资源映射不完整，请联系满托处理。",
      });
      return;
    }
    const resourceId = [...resourceIds][0]!;
    if (reviewProducts[0]!.id !== resourceId) {
      setDeepReview({
        kind: "error",
        reason: "mapping",
        message: "解析资源与产品目录不一致，请联系满托处理。",
      });
      return;
    }
    if (services.entitledContent?.configured !== true) {
      setDeepReview({
        kind: "error",
        reason: "service",
        message: "解析权限服务尚未连接，基础结果不受影响。你仍可先联系冰冰或输入已有邀请码。",
      });
      return;
    }
    let active = true;
    setDeepReview({ kind: "loading" });
    void services.entitledContent.load(resourceId).then((result) => {
      if (!active) return;
      if (result.status !== "available") {
        setDeepReview({ kind: result.status });
        return;
      }
      const payload = result.resource.payload;
      if (payload.id !== resourceId || !("paperId" in payload) || payload.paperId !== state.paper.id) {
        setDeepReview({
          kind: "error",
          reason: "payload",
          message: "解析版本与当前试卷不一致，请联系满托处理。",
        });
        return;
      }
      setDeepReview({
        kind: "available",
        payload,
        byQuestionId: new Map(payload.explanations.map((explanation) => [explanation.questionId, explanation])),
      });
    }).catch((reason) => {
      if (active) {
        setDeepReview({
          kind: "error",
          reason: "service",
          message: reason instanceof Error ? reason.message : "暂时无法读取逐题解析，请稍后重试。",
        });
      }
    });
    return () => { active = false; };
  }, [services.entitledContent, state]);

  async function restart() {
    if (state.kind !== "ready") return;
    setRestarting(true);
    await services.store.clearCurrent();
    navigate(`/practice/${state.paper.id}`);
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
        <p>只有当前学习空间中已经提交、且与你打开的地址一致的练习可以查看。</p>
        <Link className="button button--primary" to="/">返回考试首页</Link>
      </main>
    );
  }

  if (state.paper.responseMode === "essay") {
    return (
      <EssayResultView
        paper={state.paper}
        session={state.session}
        eventCount={state.eventCount}
        restarting={restarting}
        onRestart={() => void restart()}
      />
    );
  }

  const { results, eventCount, paper } = state;
  if (results === null) return null;
  const presentation = practicePaperPresentation(paper);
  const attemptedCount = results.correctCount + results.partialCount + results.incorrectCount;
  const attemptedTopics = results.topics
    .filter((topic) => topic.attemptedCount > 0)
    .sort((left, right) => right.activeMs - left.activeMs)
    .slice(0, 3);
  const deepReviewProduct = reviewContentProductsForPractice(paper.id).find(
    (product) => product.access === "invite",
  );
  const explanationMetric = deepReviewProduct?.metrics.find(
    (metric) => metric.label === "逐题解析",
  )?.value ?? `${paper.questions.length} 道`;
  const returnTo = `/results/${sessionId ?? state.session.id}`;
  const accessHref = `/access?${new URLSearchParams({ returnTo }).toString()}`;

  return (
    <div className="results-page">
      <header className="results-header page-shell">
        <BrandMark />
        <Link to={presentation.backHref} className="results-back-link">
          <ArrowLeft aria-hidden="true" />返回 {paper.exam} 练习目录
        </Link>
      </header>

      <main className="results-page">
        <section className="results-hero page-shell">
          <div className="results-hero__copy">
            <p className="eyebrow">YOUR SESSION · YOUR EVIDENCE</p>
            <h1>本次练习完成</h1>
            <p>查看本卷得分、知识表现、做题节奏和逐题答案。</p>
          </div>
          <div className="score-seal" aria-label={`得分 ${results.score} / ${results.maxScore}`}>
            <span>本次得分</span>
            <strong>{results.score} / {results.maxScore}</strong>
            <small>{results.percentage}%</small>
          </div>
        </section>

        <section className="result-metrics page-shell" aria-label="本次练习摘要">
          <article><span>正确</span><strong>正确 {results.correctCount}</strong></article>
          <article><span>错误{results.partialCount > 0 ? " / 部分得分" : ""}</span><strong>{results.partialCount > 0 ? `错误 ${results.incorrectCount} · 部分 ${results.partialCount}` : `错误 ${results.incorrectCount}`}</strong></article>
          <article><span>未作答</span><strong>未作答 {results.unansweredCount}</strong></article>
          <article><span>活跃页内用时</span><strong>{formatDuration(results.totalActiveMs)}</strong></article>
        </section>

        <section className="result-insights page-shell">
          <article className="insight-card">
            <Clock3 aria-hidden="true" />
            <p>做题节奏</p>
            <h2>{attemptedCount > 0 ? `完成 ${attemptedCount} 道作答` : "本次尚未作答"}</h2>
            <span>仅统计页面可见且练习处于活动状态的时间</span>
          </article>
          <article className="insight-card">
            <BarChart3 aria-hidden="true" />
            <p>知识表现</p>
            <h2>{attemptedTopics.length > 0 ? topicNames[attemptedTopics[0]!.knowledgeTag] ?? attemptedTopics[0]!.knowledgeTag : "等待更多数据"}</h2>
            <span>根据本卷已作答题目的知识标签汇总</span>
          </article>
          <article className="insight-card">
            <DatabaseZap aria-hidden="true" />
            <p>答题过程</p>
            <h2>{eventCount} 次有效动作</h2>
            <span>包括作答、修改、标记、浏览、计时与提交</span>
          </article>
        </section>

        <section className="benchmark-note page-shell">
          <div><ShieldCheck aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">FAIR BENCHMARK</p>
            <h2>完成更多练习后，趋势会更稳定</h2>
            <p>当前结果只反映本卷表现；随着练习增加，你会逐步看到更可靠的知识、速度和稳定性变化。</p>
          </div>
        </section>

        <section className="answer-review page-shell" aria-labelledby="answer-review-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ANSWER REVIEW</p>
              <h2 id="answer-review-title">逐题回顾</h2>
            </div>
            <span>答案仅在提交后显示</span>
          </div>
          {deepReview.kind !== "unavailable" && (
            <aside className={`deep-review-access${deepReview.kind === "available" ? " is-entitled" : ""}`}>
              {deepReview.kind === "available" ? <UnlockKeyhole aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
              <div>
                <p>{deepReview.kind === "available"
                  ? `${explanationMetric}逐题深度解析已打开`
                  : deepReview.kind === "loading"
                    ? "正在核对逐题解析权限"
                    : deepReview.kind === "error" && deepReview.reason !== "service"
                      ? "逐题解析暂时无法读取"
                      : deepReviewProduct === undefined
                        ? "逐题解析暂时不可用"
                        : `${deepReviewProduct.title.zh}已经可用`}</p>
                <span>{deepReview.kind === "available"
                  ? `${deepReview.payload.subtitleZh}。基础答案仍然免费。`
                  : deepReview.kind === "error"
                    ? deepReview.message
                    : `${deepReviewProduct?.summary ?? ""} 题目、正确答案、得分和用时始终免费。`}</span>
              </div>
              {(deepReview.kind === "locked" ||
                deepReview.kind === "unauthenticated" ||
                (deepReview.kind === "error" && deepReview.reason === "service")) && (
                <div className="deep-review-access__actions">
                  <button className="button button--primary" type="button" onClick={() => setWechatOpen(true)}>联系冰冰获取邀请码</button>
                  <Link className="button button--secondary" to={accessHref}>已有邀请码</Link>
                </div>
              )}
            </aside>
          )}
          <div className="result-list">
            {results.questions.map((result, index) => (
              <QuestionResultRow
                key={result.questionId}
                result={result}
                question={paper.questions[index]!}
                explanation={deepReview.kind === "available"
                  ? deepReview.byQuestionId.get(result.questionId)
                  : undefined}
                feedbackHref={buildFeedbackHref(normalizeFeedbackContext({
                  exam: paper.exam.toLowerCase(),
                  route: `/results/${sessionId ?? ""}`,
                  resource: paper.id,
                  question: result.questionId,
                }))}
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
          <p>重新开始会创建一份新的练习；已经提交的结果不会被改写。</p>
        </section>
      </main>
      <WechatAccessDialog
        open={wechatOpen}
        target="deep-review"
        examName={paper.exam}
        onOpenChange={setWechatOpen}
        onOpened={() => void services.funnel?.track({
          eventType: "bingbing_opened",
          examId: paper.exam.toLowerCase() as ProductFunnelExamId,
          contextCode: "result-deep-review",
        })}
      />
    </div>
  );
}
