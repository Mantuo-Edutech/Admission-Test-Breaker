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
import { practicePaperPresentation } from "../content/practice-paper-presentation.js";
import { sessionContentMatchesPaper } from "../content/published-revisions.js";
import type { PracticeResults } from "../domain/results.js";
import type { PracticeSession } from "../domain/session.js";
import type { DeliveredPracticePaper } from "../delivery/domain.js";
import { resolvePracticeDeliveryService } from "../delivery/resolve-service.js";
import { countEssayWords, parseEssayResponse } from "../domain/essay-response.js";
import { buildFeedbackHref, normalizeFeedbackContext } from "../../feedback/domain.js";
import { ESAT_KNOWLEDGE_UNITS } from "../../catalog/esat-plan.js";
import { reviewContentProductsForPractice } from "../../library/content-product-registry.js";
import { WechatAccessDialog } from "../../service-bridge/components/WechatAccessDialog.js";
import type { ProductFunnelExamId } from "../../product-funnel/domain.js";
import { EnglishFirstParagraph, EnglishFirstText } from "../../notes/components/EnglishFirstText.js";

interface ResultsPageProps {
  services: AppServices;
}

type ResultLoadState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "ready"; results: PracticeResults | null; eventCount: number; paper: DeliveredPracticePaper; session: PracticeSession };

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
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

const esatTopicNames = Object.fromEntries(
  Object.values(ESAT_KNOWLEDGE_UNITS).flat().map((unit) => [unit.id, `${unit.labelEn} · ${unit.label}`]),
);

const topicNames: Record<string, string> = {
  integration: "Integration · 积分",
  quadratics: "Quadratic functions · 二次函数",
  "sequences-series": "Sequences and series · 数列与级数",
  "geometry-optimization": "Geometric optimisation · 几何优化",
  "binomial-expansion": "Binomial expansion · 二项式展开",
  "exponentials-logarithms": "Exponentials and logarithms · 指数与对数",
  "trigonometry-geometry": "Trigonometry and geometry · 三角与几何",
  "trigonometric-equations": "Trigonometric equations · 三角方程",
  "numerical-integration": "Numerical integration · 数值积分",
  "function-transformations": "Function transformations · 函数变换",
  "coordinate-geometry-circles": "Circles and coordinate geometry · 圆与坐标几何",
  "cubic-functions": "Cubic functions · 三次函数",
  "exponentials-range": "Range of exponential functions · 指数函数值域",
  "coordinate-geometry": "Coordinate geometry · 坐标几何",
  "circle-sequences": "Circles and sequences · 圆与数列",
  "geometric-series-probability": "Geometric series and probability · 等比级数与概率",
  "differential-equations": "Differential equations · 微分方程",
  "function-range": "Range of functions · 函数值域",
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
  paper: DeliveredPracticePaper;
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
          <ArrowLeft aria-hidden="true" />Back to {paper.exam} practice
        </Link>
      </header>
      <main>
        <section className="results-hero page-shell">
          <div className="results-hero__copy">
            <p className="eyebrow">WRITING SUBMITTED · YOUR DRAFT</p>
            <h1>Writing saved and submitted<small lang="zh-CN">写作已经保存并提交</small></h1>
            <p>This result records your prompt, word count and active time. It does not invent an unvalidated score. Human marking or AI interpretation can be added only with your permission.</p>
          </div>
          <div className="score-seal" aria-label={`Word count ${wordCount}`}>
            <span>Word count</span>
            <strong>{wordCount}</strong>
            <small>words</small>
          </div>
        </section>

        <section className="result-metrics page-shell" aria-label="Writing summary">
          <article><span>Selected prompt</span><strong>{selectedPrompt?.title ?? "Not selected"}</strong></article>
          <article><span>Word count</span><strong>{wordCount} words</strong></article>
          <article><span>Active time</span><strong>{formatDuration(totalActiveMs)}</strong></article>
          <article><span>Learning events</span><strong>{eventCount}</strong></article>
        </section>

        <section className="essay-submission-review page-shell" aria-labelledby="essay-submission-title">
          <header>
            <p className="eyebrow">SUBMITTED RESPONSE</p>
            <h2 id="essay-submission-title">{selectedPrompt?.prompt ?? "No writing prompt was selected"}</h2>
          </header>
          <div>{response.text.trim() === "" ? "No response was entered." : response.text}</div>
          <p><ShieldCheck aria-hidden="true" />Your response stays in your private learner space. It is never published or used for training without permission.</p>
        </section>

        <section className="benchmark-note page-shell">
          <div><ShieldCheck aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">HONEST FEEDBACK BOUNDARY</p>
            <h2>No automatic writing score<small lang="zh-CN">当前不生成自动写作分数</small></h2>
            <p>Valid feedback needs a defined rubric, independent teacher calibration, versioning and your permission. Free writing and access to your response are never affected.</p>
          </div>
        </section>

        <section className="result-actions page-shell">
          <button className="button button--primary" type="button" disabled={restarting} onClick={onRestart}>
            <RefreshCw aria-hidden="true" />{restarting ? "Resetting…" : "Try this writing task again"}
          </button>
          <p>Restarting creates a new timed response. Your submitted writing remains unchanged.</p>
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
      try {
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
        const delivery = await resolvePracticeDeliveryService(services.practiceDelivery);
        if (delivery === null) {
          setState({ kind: "unavailable" });
          return;
        }
        const paper = await delivery.loadPaper(session.paperId, session.paperRevisionId);
        if (!active) return;
        if (paper === null || !sessionContentMatchesPaper(session, paper)) {
          setState({ kind: "unavailable" });
          return;
        }
        const results = paper.responseMode === "essay" ? null : await delivery.score(session);
        if (!active) return;
        setState({
          kind: "ready",
          results,
          eventCount: session.events.length,
          paper,
          session,
        });
      } catch {
        if (active) setState({ kind: "unavailable" });
      }
    })();
    return () => {
      active = false;
    };
  }, [services.practiceDelivery, services.practiceHistory, services.store, sessionId]);

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
          message: "The worked-explanation mapping for this paper is incomplete. Please contact Mantou.",
      });
      return;
    }
    const resourceId = [...resourceIds][0]!;
    if (reviewProducts[0]!.id !== resourceId) {
      setDeepReview({
        kind: "error",
        reason: "mapping",
        message: "The worked-explanation resource does not match the product catalogue. Please contact Mantou.",
      });
      return;
    }
    if (services.entitledContent?.configured !== true) {
      setDeepReview({
        kind: "error",
        reason: "service",
        message: "The worked-explanation access service is not connected. Your free result is unaffected; contact Bingbing or enter an existing code.",
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
          message: "This explanation revision does not match the current paper. Please contact Mantou.",
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
          message: reason instanceof Error ? reason.message : "Worked explanations could not be loaded. Please try again.",
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
        <h1>Preparing your result…<small lang="zh-CN">正在整理这次练习</small></h1>
      </main>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <main className="practice-state-page">
        <p className="eyebrow">RESULT NOT AVAILABLE</p>
        <h1>Result unavailable<small lang="zh-CN">这份结果暂时不可用</small></h1>
        <p>Only a submitted attempt from your current learner space can be opened here.</p>
        <Link className="button button--primary" to="/">Back to tests <small lang="zh-CN">返回考试首页</small></Link>
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
          <ArrowLeft aria-hidden="true" />Back to {paper.exam} practice
        </Link>
      </header>

      <main className="results-page">
        <section className="results-hero page-shell">
          <div className="results-hero__copy">
            <p className="eyebrow">YOUR SESSION · YOUR EVIDENCE</p>
            <h1>Practice complete<small lang="zh-CN">本次练习完成</small></h1>
            <p>Review your score, topic evidence, timing and answers.</p>
          </div>
          <div className="score-seal" aria-label={`Score ${results.score} / ${results.maxScore}`}>
            <span>Score</span>
            <strong>{results.score} / {results.maxScore}</strong>
            <small>{results.percentage}%</small>
          </div>
        </section>

        <section className="result-metrics page-shell" aria-label="Practice summary">
          <article><span>Correct</span><strong>{results.correctCount}</strong></article>
          <article><span>Incorrect{results.partialCount > 0 ? " / partial" : ""}</span><strong>{results.partialCount > 0 ? `${results.incorrectCount} incorrect · ${results.partialCount} partial` : results.incorrectCount}</strong></article>
          <article><span>Unanswered</span><strong>{results.unansweredCount}</strong></article>
          <article><span>Active time</span><strong>{formatDuration(results.totalActiveMs)}</strong></article>
        </section>

        <section className="result-insights page-shell">
          <article className="insight-card">
            <Clock3 aria-hidden="true" />
            <p>Pace</p>
            <h2>{attemptedCount > 0 ? `${attemptedCount} questions attempted` : "No questions attempted"}</h2>
            <span>Time is counted only while the paper is visible and active.</span>
          </article>
          <article className="insight-card">
            <BarChart3 aria-hidden="true" />
            <p>Topic evidence</p>
            <h2>{attemptedTopics.length > 0 ? topicNames[attemptedTopics[0]!.knowledgeTag] ?? attemptedTopics[0]!.knowledgeTag : "More evidence needed"}</h2>
            <span>Summarised from the knowledge tags of attempted questions.</span>
          </article>
          <article className="insight-card">
            <DatabaseZap aria-hidden="true" />
            <p>Practice activity</p>
            <h2>{eventCount} recorded actions</h2>
            <span>Answers, changes, marks, navigation, timing and submission.</span>
          </article>
        </section>

        <section className="benchmark-note page-shell">
          <div><ShieldCheck aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">FAIR BENCHMARK</p>
            <h2>Trends become more reliable with more papers<small lang="zh-CN">完成更多练习后，趋势会更稳定</small></h2>
            <p>This result describes one paper. More completed papers create better evidence about knowledge, speed and consistency.</p>
          </div>
        </section>

        <section className="answer-review page-shell" aria-labelledby="answer-review-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ANSWER REVIEW</p>
              <h2 id="answer-review-title">Answer review<small lang="zh-CN">逐题回顾</small></h2>
            </div>
            <span>Answers appear after submission.</span>
          </div>
          {deepReview.kind !== "unavailable" && (
            <aside className={`deep-review-access${deepReview.kind === "available" ? " is-entitled" : ""}`}>
              {deepReview.kind === "available" ? <UnlockKeyhole aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
              <div>
                <p>{deepReview.kind === "available"
                  ? <EnglishFirstText english={`${deepReview.payload.explanations.length} worked explanations unlocked`} chinese={`${explanationMetric}逐题深度解析已打开`} />
                  : deepReview.kind === "loading"
                    ? <EnglishFirstText english="Checking worked-explanation access" chinese="正在核对逐题解析权限" />
                    : deepReview.kind === "error" && deepReview.reason !== "service"
                      ? <EnglishFirstText english="Worked explanations are temporarily unavailable" chinese="逐题解析暂时无法读取" />
                      : deepReviewProduct === undefined
                        ? <EnglishFirstText english="Worked explanations are temporarily unavailable" chinese="逐题解析暂时不可用" />
                        : <EnglishFirstText english={`${deepReviewProduct.title.en} is available`} chinese={`${deepReviewProduct.title.zh}已经可用`} />}</p>
                <div className="deep-review-access__description">{deepReview.kind === "available"
                  ? <EnglishFirstParagraph english={`${deepReview.payload.subtitleEn}. Core answers remain free.`} chinese={`${deepReview.payload.subtitleZh}。基础答案仍然免费。`} />
                  : deepReview.kind === "error"
                    ? deepReview.message
                    : <EnglishFirstParagraph english="Questions, correct answers, scores and timings remain free." chinese={`${deepReviewProduct?.summary ?? ""} 题目、正确答案、得分和用时始终免费。`} />}</div>
              </div>
              {(deepReview.kind === "locked" ||
                deepReview.kind === "unauthenticated" ||
                (deepReview.kind === "error" && deepReview.reason === "service")) && (
                <div className="deep-review-access__actions">
                  <button className="button button--primary" type="button" onClick={() => setWechatOpen(true)}><EnglishFirstText english="Get an invitation code" chinese="联系冰冰获取邀请码" /></button>
                  <Link className="button button--secondary" to={accessHref}><EnglishFirstText english="I have a code" chinese="已有邀请码" /></Link>
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
            {restarting ? "Resetting…" : "Practise this paper again"}
          </button>
          <p>Restarting creates a new practice session. Your submitted result remains unchanged.</p>
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
