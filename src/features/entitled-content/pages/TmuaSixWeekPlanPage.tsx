import {
  ArrowRight,
  BookOpenCheck,
  Check,
  Clock3,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { WechatAccessDialog } from "../../service-bridge/components/WechatAccessDialog.js";
import {
  TMUA_SIX_WEEK_PLAN_RESOURCE_ID,
  type EntitledContentResult,
} from "../domain.js";

interface TmuaSixWeekPlanPageProps {
  readonly services: AppServices;
}

type PageState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | EntitledContentResult;

function LockedPlan({
  status,
  onBingbingOpened,
}: {
  readonly status: "unauthenticated" | "locked";
  readonly onBingbingOpened: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <>
      <section className="entitled-plan-lock page-shell" aria-labelledby="entitled-plan-lock-title">
        <div className="entitled-plan-lock__seal"><LockKeyhole aria-hidden="true" /></div>
        <div>
          <p className="eyebrow">PRIVATE LEARNING MATERIAL · 私有学习资料</p>
          <h1 id="entitled-plan-lock-title">TMUA 六周精确训练计划<span>TMUA SIX-WEEK PRECISION TRAINING PLAN</span></h1>
          <p>六周、30 次具体训练，包含每日时长、训练动作、交付证据、错误分类和不同课程体系的调整方式。</p>
          <dl>
            <div><dt>训练周期</dt><dd>6 周</dd></div>
            <div><dt>具体训练</dt><dd>30 次</dd></div>
            <div><dt>交付方式</dt><dd>本站在线阅读</dd></div>
          </dl>
          <div className="entitled-plan-lock__actions">
            {status === "unauthenticated" && <Link className="button button--secondary" to="/login">已有权限，登录查看</Link>}
            <button className="button button--primary" type="button" onClick={() => setDialogOpen(true)}>
              <KeyRound aria-hidden="true" />添加冰冰，获取邀请码
            </button>
            <Link to="/access">我已有邀请码</Link>
          </div>
          <p className="entitled-plan-lock__privacy"><ShieldCheck aria-hidden="true" />邀请码只授予资料权限，不会让冰冰、老师或家长看到你的课程信息和做题记录。</p>
        </div>
      </section>
      <WechatAccessDialog open={dialogOpen} target="published-learning-materials" examName="TMUA" onOpenChange={setDialogOpen} onOpened={onBingbingOpened} />
    </>
  );
}

export function TmuaSixWeekPlanPage({ services }: TmuaSixWeekPlanPageProps) {
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const content = services.entitledContent;
    if (content?.configured !== true) {
      setState({ status: "error", message: "资料权限服务尚未连接。请先启动 Supabase，或稍后再试。" });
      return () => { active = false; };
    }
    void content.load(TMUA_SIX_WEEK_PLAN_RESOURCE_ID)
      .then((result) => { if (active) setState(result); })
      .catch((reason) => {
        if (active) setState({
          status: "error",
          message: reason instanceof Error ? reason.message : "暂时无法读取这份资料，请稍后重试",
        });
      });
    return () => { active = false; };
  }, [services.entitledContent]);

  if (state.status === "loading") {
    return (
      <main className="entitled-plan-page">
        <SiteHeader examId="tmua" />
        <section className="entitled-plan-state page-shell" aria-live="polite">
          <LoaderCircle className="account-spinner" aria-hidden="true" />
          <p className="eyebrow">正在核对资料权限</p>
          <h1>正在打开训练计划…</h1>
        </section>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="entitled-plan-page">
        <SiteHeader examId="tmua" />
        <section className="entitled-plan-state page-shell" role="alert">
          <RotateCcw aria-hidden="true" />
          <p className="eyebrow">资料暂时不可用</p>
          <h1>没有把错误伪装成“未解锁”</h1>
          <p>{state.message}</p>
          <button className="button button--secondary" type="button" onClick={() => globalThis.location.reload()}>重新读取</button>
        </section>
      </main>
    );
  }

  if (state.status === "unauthenticated" || state.status === "locked") {
    return (
      <main className="entitled-plan-page">
        <SiteHeader examId="tmua" />
        <LockedPlan
          status={state.status}
          onBingbingOpened={() => void services.funnel?.track({
            eventType: "bingbing_opened",
            examId: "tmua",
            contextCode: "six-week-plan",
          })}
        />
      </main>
    );
  }

  const { resource } = state;
  if (resource.payload.id !== TMUA_SIX_WEEK_PLAN_RESOURCE_ID) {
    return (
      <main className="entitled-plan-page">
        <SiteHeader examId="tmua" />
        <section className="entitled-plan-state page-shell" role="alert">
          <RotateCcw aria-hidden="true" />
          <p className="eyebrow">资料版本不匹配</p>
          <h1>没有显示错误的学习资料</h1>
          <p>当前返回的资料与六周训练计划不一致，请联系满托处理。</p>
        </section>
      </main>
    );
  }
  const plan = resource.payload;

  return (
    <main className="entitled-plan-page entitled-plan-page--open">
      <SiteHeader examId="tmua" />

      <header className="entitled-plan-hero page-shell">
        <div>
          <p className="eyebrow">TMUA REVIEW PLAN · {plan.edition}</p>
          <h1>{plan.titleZh}<span>{plan.titleEn}</span></h1>
          <p>{plan.subtitleZh}</p>
          <small>{plan.subtitleEn}</small>
        </div>
        <aside>
          <span><ShieldCheck aria-hidden="true" />当前账号已授权</span>
          <dl>
            <div><dt>训练周期</dt><dd>6 周</dd></div>
            <div><dt>具体训练</dt><dd>30 次</dd></div>
            <div><dt>资源修订</dt><dd>R{resource.revision}</dd></div>
          </dl>
          <p>{plan.audienceZh}</p>
        </aside>
      </header>

      <nav className="entitled-plan-index page-shell" aria-label="训练计划目录">
        <a href="#plan-preflight">开始前</a>
        {plan.weeklyPlan.map((week) => <a key={week.week} href={`#plan-week-${week.week}`}>第 {week.week} 周</a>)}
        <a href="#plan-error-codes">错误分类</a>
        <a href="#plan-curricula">课程调整</a>
      </nav>

      <section className="entitled-plan-principles page-shell" aria-labelledby="plan-principles-title">
        <header>
          <p>HOW TO USE THIS PLAN</p>
          <h2 id="plan-principles-title">这不是一张“刷题清单”<span>Every Session Must Leave Evidence</span></h2>
        </header>
        <div>
          {plan.principles.map((principle, index) => (
            <article key={principle.titleEn}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{principle.titleZh}<small>{principle.titleEn}</small></h3>
              <p>{principle.bodyZh}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="entitled-plan-preflight page-shell" id="plan-preflight" aria-labelledby="plan-preflight-title">
        <header>
          <p>00 · BEFORE WEEK ONE</p>
          <h2 id="plan-preflight-title">{plan.preflight.titleZh}<span>{plan.preflight.titleEn}</span></h2>
        </header>
        <ol>
          {plan.preflight.steps.map((step) => (
            <li key={step.actionZh}>
              <span><Clock3 aria-hidden="true" />{step.minutes} 分钟</span>
              <h3>{step.actionZh}</h3>
              <p>{step.detailZh}</p>
              <small><Check aria-hidden="true" />留下：{step.evidenceZh}</small>
            </li>
          ))}
        </ol>
      </section>

      <section className="entitled-plan-weeks page-shell" aria-label="六周训练安排">
        {plan.weeklyPlan.map((week) => (
          <article className="entitled-plan-week" id={`plan-week-${week.week}`} key={week.week}>
            <header>
              <span>WEEK {String(week.week).padStart(2, "0")}</span>
              <div>
                <h2>{week.titleZh}<small>{week.titleEn}</small></h2>
                <p>{week.purposeZh}</p>
              </div>
              <strong>{week.targetHours}</strong>
            </header>
            <ol className="entitled-plan-sessions">
              {week.sessions.map((session) => (
                <li key={`${week.week}-${session.day}`}>
                  <div className="entitled-plan-session__meta"><span>{session.day}</span><small>{session.minutes} MIN</small></div>
                  <div>
                    <h3>{session.titleZh}</h3>
                    <ul>{session.actionsZh.map((action) => <li key={action}>{action}</li>)}</ul>
                  </div>
                  <p><BookOpenCheck aria-hidden="true" /><span><small>本次留下</small>{session.evidenceZh}</span></p>
                </li>
              ))}
            </ol>
            <footer>
              <strong>进入下一周前，你应当能够：</strong>
              <ul>{week.exitCriteriaZh.map((criterion) => <li key={criterion}><Check aria-hidden="true" />{criterion}</li>)}</ul>
            </footer>
          </article>
        ))}
      </section>

      <section className="entitled-plan-codebook page-shell" id="plan-error-codes" aria-labelledby="plan-error-code-title">
        <header>
          <p>ERROR CODEBOOK</p>
          <h2 id="plan-error-code-title">不是“粗心”，而是五种不同问题<span>Five Errors, Five Different Responses</span></h2>
        </header>
        <div>
          {plan.errorCodebook.map((errorCode) => (
            <article key={errorCode.code}>
              <span>{errorCode.code}</span>
              <h3>{errorCode.nameZh}<small>{errorCode.nameEn}</small></h3>
              <p>{errorCode.signalZh}</p>
              <strong>{errorCode.nextActionZh}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="entitled-plan-curricula page-shell" id="plan-curricula" aria-labelledby="plan-curricula-title">
        <header>
          <p>CURRICULUM ADJUSTMENTS</p>
          <h2 id="plan-curricula-title">同一计划，不同起点<span>Adjust by Evidence, Not by Label</span></h2>
        </header>
        <div>
          {plan.curriculumAdjustments.map((adjustment) => (
            <article key={adjustment.curriculum}>
              <h3>{adjustment.curriculum}</h3>
              <p>{adjustment.guidanceZh}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="entitled-plan-review page-shell" aria-labelledby="plan-review-title">
        <div>
          <p>WEEKLY REVIEW</p>
          <h2 id="plan-review-title">{plan.weeklyReview.titleZh}<span>{plan.weeklyReview.titleEn}</span></h2>
        </div>
        <ol>{plan.weeklyReview.questionsZh.map((question) => <li key={question}>{question}</li>)}</ol>
      </section>

      <aside className="entitled-plan-benchmark page-shell">
        <div><p>HONEST BENCHMARK</p><h2>{plan.benchmarkBoundary.titleZh}<span>{plan.benchmarkBoundary.titleEn}</span></h2></div>
        <p>{plan.benchmarkBoundary.bodyZh}</p>
      </aside>

      <section className="entitled-plan-next page-shell">
        <div><p>START WITH YOUR EVIDENCE</p><h2>从你的课程和诊断开始</h2><span>计划负责安排动作，系统负责保存每一次真实训练。</span></div>
        <div><Link className="button button--secondary" to="/exams/tmua/coverage">查看知识覆盖</Link><Link className="button button--primary" to="/exams/tmua/diagnostic">开始 30 分钟诊断<ArrowRight aria-hidden="true" /></Link></div>
      </section>

      <footer className="entitled-plan-provenance page-shell">
        <p>{plan.authorship} · {plan.rightsNotice}</p>
        <small>RESOURCE {resource.id} · SHA256 {resource.sourceSha256.slice(0, 12)}…</small>
      </footer>
    </main>
  );
}
