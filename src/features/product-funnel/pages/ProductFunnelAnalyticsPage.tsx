import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  MousePointerClick,
  ShieldCheck,
  UserRoundX,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { BrandMark } from "../../navigation/components/BrandMark.js";
import {
  PRODUCT_FUNNEL_ANALYTICS_PERIODS,
  PRODUCT_FUNNEL_STAGE_DEFINITIONS,
  buildProductFunnelAnalyticsSnapshot,
  productFunnelAnalyticsSince,
  type ProductFunnelAnalyticsContext,
  type ProductFunnelAnalyticsPeriod,
  type ProductFunnelStageSummaryRow,
} from "../analytics-domain.js";

interface ProductFunnelAnalyticsPageProps {
  readonly services: AppServices;
}

type PageState = "loading" | "unauthenticated" | "forbidden" | "ready" | "unavailable";

const examNames = {
  tmua: "TMUA",
  esat: "ESAT",
  tara: "TARA",
  lnat: "LNAT",
  ucat: "UCAT",
} as const;

export function ProductFunnelAnalyticsPage({ services }: ProductFunnelAnalyticsPageProps) {
  const location = useLocation();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [context, setContext] = useState<ProductFunnelAnalyticsContext | null>(null);
  const [period, setPeriod] = useState<ProductFunnelAnalyticsPeriod>(30);
  const [rows, setRows] = useState<readonly ProductFunnelStageSummaryRow[]>([]);
  const analytics = services.productFunnelAnalytics;

  useEffect(() => {
    let active = true;
    async function load() {
      if (services.accountAccess?.configured !== true || analytics?.configured !== true) {
        if (active) setPageState("unavailable");
        return;
      }
      setPageState("loading");
      try {
        const access = await services.accountAccess.getAccessState();
        if (!active) return;
        if (access.session === null) {
          setPageState("unauthenticated");
          return;
        }
        const nextContext = await analytics.getContext();
        if (!active) return;
        setContext(nextContext);
        if (!nextContext.active) {
          setPageState("forbidden");
          return;
        }
        const nextRows = await analytics.loadStageSummary(
          productFunnelAnalyticsSince(services.now(), period),
        );
        if (!active) return;
        setRows(nextRows);
        setPageState("ready");
      } catch {
        if (active) setPageState("unavailable");
      }
    }
    void load();
    return () => { active = false; };
  }, [analytics, period, services]);

  const snapshot = useMemo(() => buildProductFunnelAnalyticsSnapshot(rows), [rows]);
  const overall = snapshot.overall.stages;
  const loginState = { returnTo: `${location.pathname}${location.search}` };

  return (
    <main className="funnel-analytics-page">
      <header className="site-header page-shell">
        <Link className="site-navigation-header__brand" to="/" aria-label="满托考试练习场首页"><BrandMark /></Link>
        <Link className="tmua-hub-page__back" to="/account"><ArrowLeft aria-hidden="true" />返回账号</Link>
      </header>

      {pageState === "loading" && (
        <section className="funnel-analytics-state page-shell" aria-live="polite">
          <LoaderCircle className="account-spinner" aria-hidden="true" />
          <p className="eyebrow">满托内部 · CONVERSION ANALYTICS</p>
          <h1>正在读取聚合转化数据…</h1>
        </section>
      )}

      {pageState !== "loading" && pageState !== "ready" && (
        <section className="funnel-analytics-state page-shell">
          {pageState === "unauthenticated"
            ? <LockKeyhole aria-hidden="true" />
            : pageState === "forbidden"
              ? <UserRoundX aria-hidden="true" />
              : <ShieldCheck aria-hidden="true" />}
          <p className="eyebrow">PRIVATE OPERATIONS · 私有运营</p>
          <h1>{pageState === "unauthenticated"
            ? "请先登录运营账号"
            : pageState === "forbidden"
              ? "当前账号没有转化看板权限"
              : "转化看板暂时无法连接"}</h1>
          <p>{pageState === "unauthenticated"
            ? "登录后仍需通过独立的聚合数据查看权限；普通学生账号不能打开看板。"
            : pageState === "forbidden"
              ? "该权限由创始人单独授予和撤销，不随邀请码运营权限自动获得。"
              : "请稍后重试。学习和邀请码流程不会因为分析服务不可用而中断。"}</p>
          {pageState === "unauthenticated" && <Link className="button button--primary" to="/login" state={loginState}>登录并继续</Link>}
          {pageState === "forbidden" && <Link className="button button--secondary" to="/account">返回学生账号</Link>}
        </section>
      )}

      {pageState === "ready" && (
        <>
          <section className="funnel-analytics-hero page-shell">
            <div>
              <p className="eyebrow">满托内部 · CONVERSION ANALYTICS</p>
              <h1>看清学生在哪一步<br />建立信任<span>Understand the journey, not the student</span></h1>
              <p>只统计匿名站内 Journey 的固定动作，用来判断考试入口、练习体验和冰冰服务是否真正形成闭环。</p>
            </div>
            <aside>
              <BarChart3 aria-hidden="true" />
              <span>当前看板账号</span>
              <strong>{context?.displayName ?? "已授权查看者"}</strong>
              <p>看不到邮箱、课程、答案、IP、设备或任何学生身份。</p>
            </aside>
          </section>

          <section className="funnel-analytics-toolbar page-shell" aria-label="看板筛选">
            <div>
              <p>统计窗口 · PERIOD</p>
              <strong>最近 {period} 天</strong>
            </div>
            <label>
              <span>选择统计时间范围</span>
              <select
                aria-label="统计时间范围"
                value={period}
                onChange={(event) => setPeriod(Number(event.target.value) as ProductFunnelAnalyticsPeriod)}
              >
                {PRODUCT_FUNNEL_ANALYTICS_PERIODS.map((days) => <option key={days} value={days}>最近 {days} 天</option>)}
              </select>
            </label>
          </section>

          <section className="funnel-analytics-metrics page-shell" aria-label="满托转化概况">
            <article><MousePointerClick aria-hidden="true" /><span>选择考试</span><strong>{overall.exam_selected.uniqueJourneys}</strong><small>个匿名 Journey</small></article>
            <article><BookOpenCheck aria-hidden="true" /><span>完成练习</span><strong>{overall.practice_completed.uniqueJourneys}</strong><small>个匿名 Journey</small></article>
            <article><CheckCircle2 aria-hidden="true" /><span>打开冰冰</span><strong>{overall.bingbing_opened.uniqueJourneys}</strong><small>个匿名 Journey</small></article>
            <article><KeyRound aria-hidden="true" /><span>邀请码成功</span><strong>{overall.invite_redeemed.uniqueJourneys}</strong><small>个匿名 Journey</small></article>
          </section>

          <section className="funnel-stage-ledger page-shell" aria-labelledby="funnel-stage-title">
            <header>
              <div><p>JOURNEY MILESTONES</p><h2 id="funnel-stage-title">六个固定转化动作</h2></div>
              <span>每一步独立按 Journey 去重；这些数字不是学生人数，也不是严格同 cohort 转化率。</span>
            </header>
            <ol>
              {PRODUCT_FUNNEL_STAGE_DEFINITIONS.map((stage, index) => {
                const row = overall[stage.eventType];
                return (
                  <li key={stage.eventType}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><p>{stage.labelEn}</p><h3>{stage.labelZh}</h3><small>{stage.explanation}</small></div>
                    <strong>{row.uniqueJourneys}<small>Journey</small></strong>
                    <em>{row.eventCount} 次动作</em>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="funnel-exam-breakdown page-shell" aria-labelledby="funnel-exam-title">
            <header>
              <p>BY EXAM · 按考试查看</p>
              <h2 id="funnel-exam-title">五项考试的触达路径</h2>
            </header>
            <div>
              {snapshot.exams.map((exam) => (
                <article key={exam.scopeExamId}>
                  <h3>{exam.scopeExamId === "all" ? "ALL" : examNames[exam.scopeExamId]}</h3>
                  <dl>
                    <div><dt>选择考试</dt><dd>{exam.stages.exam_selected.uniqueJourneys}</dd></div>
                    <div><dt>开始练习</dt><dd>{exam.stages.practice_started.uniqueJourneys}</dd></div>
                    <div><dt>完成练习</dt><dd>{exam.stages.practice_completed.uniqueJourneys}</dd></div>
                    <div><dt>打开冰冰</dt><dd>{exam.stages.bingbing_opened.uniqueJourneys}</dd></div>
                    <div><dt>邀请码成功</dt><dd>{exam.stages.invite_redeemed.uniqueJourneys}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <section className="funnel-analytics-boundary page-shell">
            <ShieldCheck aria-hidden="true" />
            <div>
              <p>PRIVACY BOUNDARY · 隐私边界</p>
              <h2>这个看板只能回答“产品哪里需要改进”</h2>
              <p>随机 Journey ID 只在浏览器 session 中存在；聚合看板没有账号或 Learner Space 外键，也不能用来判断某位学生是谁、能力如何或是否应该被销售联系。</p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
