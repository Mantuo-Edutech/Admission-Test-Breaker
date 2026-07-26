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
import { EnglishFirstParagraph, EnglishFirstText } from "../../notes/components/EnglishFirstText.js";
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
          <h1 id="entitled-plan-lock-title"><EnglishFirstText english="TMUA Six-Week Precision Training Plan" chinese="TMUA 六周精确训练计划" /></h1>
          <EnglishFirstParagraph english="Six weeks and 30 specific sessions, with timings, actions, evidence, error codes and curriculum adjustments." chinese="六周、30 次具体训练，包含每日时长、训练动作、交付证据、错误分类和不同课程体系的调整方式。" />
          <dl>
            <div><dt>Duration <small lang="zh-CN">训练周期</small></dt><dd>6 weeks</dd></div>
            <div><dt>Sessions <small lang="zh-CN">具体训练</small></dt><dd>30</dd></div>
            <div><dt>Format <small lang="zh-CN">交付方式</small></dt><dd>Online</dd></div>
          </dl>
          <div className="entitled-plan-lock__actions">
            {status === "unauthenticated" && <Link className="button button--secondary" to="/login"><EnglishFirstText english="Sign in with access" chinese="已有权限，登录查看" /></Link>}
            <button className="button button--primary" type="button" onClick={() => setDialogOpen(true)}>
              <KeyRound aria-hidden="true" /><EnglishFirstText english="Get an invitation code" chinese="添加冰冰，获取邀请码" />
            </button>
            <Link to="/access">I have a code <small lang="zh-CN">我已有邀请码</small></Link>
          </div>
          <p className="entitled-plan-lock__privacy"><ShieldCheck aria-hidden="true" /><span lang="en">The code grants access to this material only.</span><small lang="zh-CN">邀请码不会让冰冰、老师或家长看到你的课程信息和做题记录。</small></p>
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
      setState({ status: "error", message: "The content-access service is not connected. · 资料权限服务尚未连接，请稍后再试。" });
      return () => { active = false; };
    }
    void content.load(TMUA_SIX_WEEK_PLAN_RESOURCE_ID)
      .then((result) => { if (active) setState(result); })
      .catch((reason) => {
        if (active) setState({
          status: "error",
          message: reason instanceof Error ? reason.message : "The material could not be loaded. · 暂时无法读取这份资料，请稍后重试。",
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
          <p className="eyebrow">CHECKING ACCESS · 正在核对资料权限</p>
          <h1>Opening your training plan… <small lang="zh-CN">正在打开训练计划</small></h1>
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
          <p className="eyebrow">TEMPORARILY UNAVAILABLE · 资料暂时不可用</p>
          <h1>We could not load the plan <small lang="zh-CN">没有把错误伪装成“未解锁”</small></h1>
          <p>{state.message}</p>
          <button className="button button--secondary" type="button" onClick={() => globalThis.location.reload()}>Try again <small lang="zh-CN">重新读取</small></button>
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
          <p className="eyebrow">RESOURCE MISMATCH · 资料版本不匹配</p>
          <h1>We did not display the wrong material <small lang="zh-CN">没有显示错误的学习资料</small></h1>
          <EnglishFirstParagraph english="The returned resource does not match this six-week plan. Please contact Mantou so we can correct the delivery." chinese="当前返回的资料与六周训练计划不一致，请联系满托处理。" />
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
          <h1><EnglishFirstText english={plan.titleEn} chinese={plan.titleZh} /></h1>
          <EnglishFirstParagraph english={plan.subtitleEn} chinese={plan.subtitleZh} />
        </div>
        <aside>
          <span><ShieldCheck aria-hidden="true" />ACCESS GRANTED <small lang="zh-CN">当前账号已授权</small></span>
          <dl>
            <div><dt>Duration <small lang="zh-CN">训练周期</small></dt><dd>6 weeks</dd></div>
            <div><dt>Sessions <small lang="zh-CN">具体训练</small></dt><dd>30</dd></div>
            <div><dt>Revision <small lang="zh-CN">资源修订</small></dt><dd>R{resource.revision}</dd></div>
          </dl>
          <EnglishFirstParagraph english={plan.audienceEn} chinese={plan.audienceZh} />
        </aside>
      </header>

      <nav className="entitled-plan-index page-shell" aria-label="Training plan contents">
        <a href="#plan-preflight">Preflight <small lang="zh-CN">开始前</small></a>
        {plan.weeklyPlan.map((week) => <a key={week.week} href={`#plan-week-${week.week}`}>Week {week.week} <small lang="zh-CN">第 {week.week} 周</small></a>)}
        <a href="#plan-error-codes">Error codes <small lang="zh-CN">错误分类</small></a>
        <a href="#plan-curricula">Curriculum adjustments <small lang="zh-CN">课程调整</small></a>
      </nav>

      <section className="entitled-plan-principles page-shell" aria-labelledby="plan-principles-title">
        <header>
          <p>HOW TO USE THIS PLAN</p>
          <h2 id="plan-principles-title"><EnglishFirstText english="Every Session Must Leave Evidence" chinese="这不是一张‘刷题清单’" /></h2>
        </header>
        <div>
          {plan.principles.map((principle, index) => (
            <article key={principle.titleEn}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3><EnglishFirstText english={principle.titleEn} chinese={principle.titleZh} /></h3>
              <EnglishFirstParagraph english={principle.bodyEn} chinese={principle.bodyZh} />
            </article>
          ))}
        </div>
      </section>

      <section className="entitled-plan-preflight page-shell" id="plan-preflight" aria-labelledby="plan-preflight-title">
        <header>
          <p>00 · BEFORE WEEK ONE</p>
          <h2 id="plan-preflight-title"><EnglishFirstText english={plan.preflight.titleEn} chinese={plan.preflight.titleZh} /></h2>
        </header>
        <ol>
          {plan.preflight.steps.map((step) => (
            <li key={step.actionEn}>
              <span><Clock3 aria-hidden="true" />{step.minutes} minutes</span>
              <h3><EnglishFirstText english={step.actionEn} chinese={step.actionZh} /></h3>
              <EnglishFirstParagraph english={step.detailEn} chinese={step.detailZh} />
              <div><Check aria-hidden="true" /><strong>EVIDENCE <small lang="zh-CN">留下</small></strong><EnglishFirstParagraph english={step.evidenceEn} chinese={step.evidenceZh} /></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="entitled-plan-weeks page-shell" aria-label="Six-week training schedule">
        {plan.weeklyPlan.map((week) => (
          <article className="entitled-plan-week" id={`plan-week-${week.week}`} key={week.week}>
            <header>
              <span>WEEK {String(week.week).padStart(2, "0")}</span>
              <div>
                <h2><EnglishFirstText english={week.titleEn} chinese={week.titleZh} /></h2>
                <EnglishFirstParagraph english={week.purposeEn} chinese={week.purposeZh} />
              </div>
              <strong><EnglishFirstText english={week.targetHoursEn} chinese={week.targetHours} /></strong>
            </header>
            <ol className="entitled-plan-sessions">
              {week.sessions.map((session) => (
                <li key={`${week.week}-${session.day}`}>
                  <div className="entitled-plan-session__meta"><span>{session.day}</span><small>{session.minutes} MIN</small></div>
                  <div>
                    <h3><EnglishFirstText english={session.titleEn} chinese={session.titleZh} /></h3>
                    <ul>{session.actionsEn.map((action, index) => <li key={action}><EnglishFirstParagraph english={action} chinese={session.actionsZh[index] ?? ""} /></li>)}</ul>
                  </div>
                  <div><BookOpenCheck aria-hidden="true" /><span><small>EVIDENCE <span lang="zh-CN">本次留下</span></small><EnglishFirstParagraph english={session.evidenceEn} chinese={session.evidenceZh} /></span></div>
                </li>
              ))}
            </ol>
            <footer>
              <strong>BEFORE THE NEXT WEEK <small lang="zh-CN">进入下一周前，你应当能够</small></strong>
              <ul>{week.exitCriteriaEn.map((criterion, index) => <li key={criterion}><Check aria-hidden="true" /><EnglishFirstParagraph english={criterion} chinese={week.exitCriteriaZh[index] ?? ""} /></li>)}</ul>
            </footer>
          </article>
        ))}
      </section>

      <section className="entitled-plan-codebook page-shell" id="plan-error-codes" aria-labelledby="plan-error-code-title">
        <header>
          <p>ERROR CODEBOOK</p>
          <h2 id="plan-error-code-title"><EnglishFirstText english="Five Errors, Five Different Responses" chinese="不是‘粗心’，而是五种不同问题" /></h2>
        </header>
        <div>
          {plan.errorCodebook.map((errorCode) => (
            <article key={errorCode.code}>
              <span>{errorCode.code}</span>
              <h3><EnglishFirstText english={errorCode.nameEn} chinese={errorCode.nameZh} /></h3>
              <EnglishFirstParagraph english={errorCode.signalEn} chinese={errorCode.signalZh} />
              <div><strong>NEXT ACTION <small lang="zh-CN">下一步</small></strong><EnglishFirstParagraph english={errorCode.nextActionEn} chinese={errorCode.nextActionZh} /></div>
            </article>
          ))}
        </div>
      </section>

      <section className="entitled-plan-curricula page-shell" id="plan-curricula" aria-labelledby="plan-curricula-title">
        <header>
          <p>CURRICULUM ADJUSTMENTS</p>
          <h2 id="plan-curricula-title"><EnglishFirstText english="Adjust by Evidence, Not by Label" chinese="同一计划，不同起点" /></h2>
        </header>
        <div>
          {plan.curriculumAdjustments.map((adjustment) => (
            <article key={adjustment.curriculum}>
              <h3>{adjustment.curriculum}</h3>
              <EnglishFirstParagraph english={adjustment.guidanceEn} chinese={adjustment.guidanceZh} />
            </article>
          ))}
        </div>
      </section>

      <section className="entitled-plan-review page-shell" aria-labelledby="plan-review-title">
        <div>
          <p>WEEKLY REVIEW</p>
          <h2 id="plan-review-title"><EnglishFirstText english={plan.weeklyReview.titleEn} chinese={plan.weeklyReview.titleZh} /></h2>
        </div>
        <ol>{plan.weeklyReview.questionsEn.map((question, index) => <li key={question}><EnglishFirstParagraph english={question} chinese={plan.weeklyReview.questionsZh[index] ?? ""} /></li>)}</ol>
      </section>

      <aside className="entitled-plan-benchmark page-shell">
        <div><p>HONEST BENCHMARK</p><h2><EnglishFirstText english={plan.benchmarkBoundary.titleEn} chinese={plan.benchmarkBoundary.titleZh} /></h2></div>
        <EnglishFirstParagraph english={plan.benchmarkBoundary.bodyEn} chinese={plan.benchmarkBoundary.bodyZh} />
      </aside>

      <section className="entitled-plan-next page-shell">
        <div><p>START WITH YOUR EVIDENCE</p><h2><EnglishFirstText english="Start with your curriculum and diagnostic" chinese="从你的课程和诊断开始" /></h2><EnglishFirstParagraph english="The plan defines the actions; the system preserves evidence from every session." chinese="计划负责安排动作，系统负责保存每一次真实训练。" /></div>
        <div><Link className="button button--secondary" to="/exams/tmua/coverage"><EnglishFirstText english="View knowledge coverage" chinese="查看知识覆盖" /></Link><Link className="button button--primary" to="/exams/tmua/diagnostic"><EnglishFirstText english="Start the 30-minute diagnostic" chinese="开始 30 分钟诊断" /><ArrowRight aria-hidden="true" /></Link></div>
      </section>

      <footer className="entitled-plan-provenance page-shell">
        <p>{plan.authorship}</p><EnglishFirstParagraph english={plan.rightsNoticeEn} chinese={plan.rightsNotice} />
        <small>RESOURCE {resource.id} · SHA256 {resource.sourceSha256.slice(0, 12)}…</small>
      </footer>
    </main>
  );
}
