import {
  BookOpenCheck,
  Check,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { EsatPlanRequiredState } from "../../catalog/components/EsatPlanRequiredState.js";
import { loadEsatPreparationPlan } from "../../catalog/esat-plan.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { EnglishFirstParagraph, EnglishFirstText } from "../../notes/components/EnglishFirstText.js";
import { WechatAccessDialog } from "../../service-bridge/components/WechatAccessDialog.js";
import {
  ESAT_ADVANCED_NOTES_RESOURCE_ID,
  TARA_ADVANCED_NOTES_RESOURCE_ID,
  type AdvancedNotesResourceId,
  type AdvancedReviewNotes,
} from "../advanced-review-notes.js";
import type { EntitledContentResult } from "../domain.js";

type PageState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | EntitledContentResult;

interface AdvancedReviewNotesPageProps {
  readonly services: AppServices;
  readonly examId: "esat" | "tara";
  readonly resourceId: AdvancedNotesResourceId;
  readonly visibleModuleIds?: readonly string[];
}

function LockedAdvancedNotes({
  examId,
  status,
  onOpened,
}: {
  readonly examId: "esat" | "tara";
  readonly status: "unauthenticated" | "locked";
  readonly onOpened: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const examName: "ESAT" | "TARA" = examId === "esat" ? "ESAT" : "TARA";
  return (
    <>
      <section className="advanced-notes-lock page-shell" aria-labelledby="advanced-notes-lock-title">
        <div><LockKeyhole aria-hidden="true" /></div>
        <div>
          <p className="eyebrow">PRIVATE ADVANCED NOTES · 私有深度笔记</p>
          <h1 id="advanced-notes-lock-title">
            <EnglishFirstText
              english={`${examName} Advanced Strategy Notes`}
              chinese={`${examName} 深度策略笔记`}
            />
          </h1>
          <EnglishFirstParagraph
            english="Module-specific playbooks, worked cases, common traps and measurable training prescriptions—written for students who have already begun timed practice."
            chinese="按模块提供识别信号、完整案例、常见陷阱和可衡量训练处方，适合已经开始限时练习的学生。"
          />
          <ul>
            <li><Check aria-hidden="true" />Playbooks <small lang="zh-CN">解题策略</small></li>
            <li><Check aria-hidden="true" />Worked cases <small lang="zh-CN">完整案例</small></li>
            <li><Check aria-hidden="true" />Training prescriptions <small lang="zh-CN">训练处方</small></li>
          </ul>
          <div className="advanced-notes-lock__actions">
            {status === "unauthenticated" && (
              <Link className="button button--secondary" to="/login">
                <EnglishFirstText english="Sign in with access" chinese="已有权限，登录查看" />
              </Link>
            )}
            <button className="button button--primary" type="button" onClick={() => setDialogOpen(true)}>
              <KeyRound aria-hidden="true" />
              <EnglishFirstText english="Get an invitation code" chinese="添加冰冰，获取邀请码" />
            </button>
            <Link to="/access">I have a code <small lang="zh-CN">我已有邀请码</small></Link>
          </div>
          <p className="advanced-notes-lock__privacy">
            <ShieldCheck aria-hidden="true" />
            <span lang="en">The code grants this content permission only.</span>
            <small lang="zh-CN">邀请码不会授予冰冰、老师或家长查看你的课程信息和练习记录。</small>
          </p>
        </div>
      </section>
      <WechatAccessDialog
        open={dialogOpen}
        target="review-notes"
        examName={examName}
        onOpenChange={setDialogOpen}
        onOpened={onOpened}
      />
    </>
  );
}

function AdvancedNotesBody({
  notes,
  revision,
  visibleModuleIds,
}: {
  readonly notes: AdvancedReviewNotes;
  readonly revision: number;
  readonly visibleModuleIds?: readonly string[];
}) {
  const modules = visibleModuleIds === undefined
    ? notes.modules
    : notes.modules.filter((module) => visibleModuleIds.includes(module.id));
  const practiceHref = `/exams/${notes.examId}/past-papers`;

  return (
    <main className="advanced-notes-page advanced-notes-page--open">
      <SiteHeader examId={notes.examId} />

      <header className="advanced-notes-hero page-shell">
        <div>
          <p className="eyebrow">ADVANCED NOTES · {notes.edition}</p>
          <h1><EnglishFirstText english={notes.titleEn} chinese={notes.titleZh} /></h1>
          <EnglishFirstParagraph english={notes.subtitleEn} chinese={notes.subtitleZh} />
          <a className="button button--primary" href="#advanced-notes-modules">
            <EnglishFirstText english="Start with my modules" chinese="开始阅读我的模块" />
          </a>
        </div>
        <aside>
          <span><ShieldCheck aria-hidden="true" />ACCESS GRANTED <small lang="zh-CN">当前账号已授权</small></span>
          <strong>{modules.length}</strong>
          <EnglishFirstParagraph english="modules in this pathway" chinese="个当前路径模块" />
          <small>REVISION {revision}</small>
          <EnglishFirstParagraph english={notes.audienceEn} chinese={notes.audienceZh} />
        </aside>
      </header>

      <nav className="advanced-notes-index page-shell" aria-label="Advanced notes contents">
        {modules.map((module) => (
          <a key={module.id} href={`#advanced-notes-${module.id}`}>
            {module.titleEn}<small lang="zh-CN">{module.titleZh}</small>
          </a>
        ))}
        <a href="#advanced-notes-protocol">Review protocol <small lang="zh-CN">复盘流程</small></a>
      </nav>

      <section className="advanced-notes-modules page-shell" id="advanced-notes-modules" aria-label="Advanced review modules">
        {modules.map((module) => (
          <article className="advanced-notes-module" id={`advanced-notes-${module.id}`} key={module.id}>
            <header>
              <span>{module.number}</span>
              <div>
                <p>MODULE PLAYBOOK</p>
                <h2><EnglishFirstText english={module.titleEn} chinese={module.titleZh} /></h2>
                <EnglishFirstParagraph english={module.purposeEn} chinese={module.purposeZh} />
              </div>
              <aside>
                <strong>KNOWLEDGE FOCUS <small lang="zh-CN">知识重点</small></strong>
                <ul>{module.knowledgeFocusEn.map((item, index) => (
                  <li key={item}><span lang="en">{item}</span><small lang="zh-CN">{module.knowledgeFocusZh[index]}</small></li>
                ))}</ul>
              </aside>
            </header>

            <section className="advanced-notes-playbooks" aria-label={`${module.titleEn} playbooks`}>
              {module.playbooks.map((playbook, index) => (
                <article key={playbook.titleEn}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3><EnglishFirstText english={playbook.titleEn} chinese={playbook.titleZh} /></h3>
                  <dl>
                    <div><dt>TRIGGER <small lang="zh-CN">识别信号</small></dt><dd><EnglishFirstParagraph english={playbook.triggerEn} chinese={playbook.triggerZh} /></dd></div>
                    <div><dt>ACTION <small lang="zh-CN">标准动作</small></dt><dd><EnglishFirstParagraph english={playbook.actionEn} chinese={playbook.actionZh} /></dd></div>
                    <div><dt>CHECK <small lang="zh-CN">最后检查</small></dt><dd><EnglishFirstParagraph english={playbook.checkEn} chinese={playbook.checkZh} /></dd></div>
                  </dl>
                </article>
              ))}
            </section>

            <section className="advanced-notes-case">
              <header><BookOpenCheck aria-hidden="true" /><div><p>WORKED CASE</p><h3><EnglishFirstText english={module.workedCase.titleEn} chinese={module.workedCase.titleZh} /></h3></div></header>
              <div className="advanced-notes-case__prompt"><strong>PROBLEM <small lang="zh-CN">问题</small></strong><EnglishFirstParagraph english={module.workedCase.promptEn} chinese={module.workedCase.promptZh} /></div>
              <ol>{module.workedCase.steps.map((step, index) => (
                <li key={step.labelEn}>
                  <span>STEP {String(index + 1).padStart(2, "0")}</span>
                  <h4><EnglishFirstText english={step.labelEn} chinese={step.labelZh} /></h4>
                  <EnglishFirstParagraph english={step.bodyEn} chinese={step.bodyZh} />
                </li>
              ))}</ol>
              <footer>
                <div><strong>CONCLUSION <small lang="zh-CN">结论</small></strong><EnglishFirstParagraph english={module.workedCase.answerEn} chinese={module.workedCase.answerZh} /></div>
                <div><strong>COMMON TRAP <small lang="zh-CN">常见误区</small></strong><EnglishFirstParagraph english={module.workedCase.trapEn} chinese={module.workedCase.trapZh} /></div>
              </footer>
            </section>

            <section className="advanced-notes-prescription">
              <p>TRAINING PRESCRIPTION <small lang="zh-CN">训练处方</small></p>
              <ol>{module.trainingPrescriptionEn.map((item, index) => (
                <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><EnglishFirstParagraph english={item} chinese={module.trainingPrescriptionZh[index]} /></li>
              ))}</ol>
            </section>
          </article>
        ))}
      </section>

      <section className="advanced-notes-protocol page-shell" id="advanced-notes-protocol" aria-labelledby="advanced-notes-protocol-title">
        <header><p>REVIEW PROTOCOL</p><h2 id="advanced-notes-protocol-title"><EnglishFirstText english="Use the notes after evidence, not instead of it" chinese="先有作答证据，再使用深度笔记" /></h2></header>
        <ol>{notes.reviewProtocol.map((step, index) => (
          <li key={step.stepEn}><span>{String(index + 1).padStart(2, "0")}</span><h3><EnglishFirstText english={step.stepEn} chinese={step.stepZh} /></h3><EnglishFirstParagraph english={step.actionEn} chinese={step.actionZh} /></li>
        ))}</ol>
        <Link className="button button--primary" to={practiceHref}><EnglishFirstText english={`Practise ${notes.examId.toUpperCase()} online`} chinese="进入在线练习" /></Link>
      </section>

      <footer className="advanced-notes-provenance page-shell">
        <p><EnglishFirstText english={notes.authorshipEn} chinese={notes.authorshipZh} /></p>
        <EnglishFirstParagraph english={notes.rightsNoticeEn} chinese={notes.rightsNoticeZh} />
        <small>{notes.sourceAnchors.length} VERIFIED SOURCE ANCHORS</small>
      </footer>
    </main>
  );
}

export function AdvancedReviewNotesPage({
  services,
  examId,
  resourceId,
  visibleModuleIds,
}: AdvancedReviewNotesPageProps) {
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    if (services.entitledContent?.configured !== true) {
      setState({ status: "error", message: "The private-content service is not connected. · 私有资料服务尚未连接。" });
      return () => { active = false; };
    }
    void services.entitledContent.load(resourceId)
      .then((result) => { if (active) setState(result); })
      .catch((reason) => {
        if (active) setState({
          status: "error",
          message: reason instanceof Error ? reason.message : "The notes are temporarily unavailable.",
        });
      });
    return () => { active = false; };
  }, [resourceId, services.entitledContent]);

  if (state.status === "loading") {
    return (
      <main className="advanced-notes-page"><SiteHeader examId={examId} /><section className="advanced-notes-state page-shell" aria-live="polite"><LoaderCircle className="account-spinner" aria-hidden="true" /><p>CHECKING ACCESS · 正在核对资料权限</p><h1>Opening advanced notes… <small lang="zh-CN">正在打开深度笔记</small></h1></section></main>
    );
  }
  if (state.status === "error") {
    return (
      <main className="advanced-notes-page"><SiteHeader examId={examId} /><section className="advanced-notes-state page-shell" role="alert"><RotateCcw aria-hidden="true" /><p>TEMPORARILY UNAVAILABLE · 资料暂时不可用</p><h1>We could not load the notes <small lang="zh-CN">无法读取这份资料</small></h1><p>{state.message}</p><button className="button button--secondary" type="button" onClick={() => globalThis.location.reload()}>Try again <small lang="zh-CN">重新读取</small></button></section></main>
    );
  }
  if (state.status === "unauthenticated" || state.status === "locked") {
    return (
      <main className="advanced-notes-page"><SiteHeader examId={examId} /><LockedAdvancedNotes examId={examId} status={state.status} onOpened={() => void services.funnel?.track({ eventType: "bingbing_opened", examId, contextCode: "advanced-notes" })} /></main>
    );
  }

  const payload = state.resource.payload;
  if (
    (payload.id !== ESAT_ADVANCED_NOTES_RESOURCE_ID && payload.id !== TARA_ADVANCED_NOTES_RESOURCE_ID) ||
    payload.id !== resourceId ||
    payload.examId !== examId
  ) {
    return (
      <main className="advanced-notes-page"><SiteHeader examId={examId} /><section className="advanced-notes-state page-shell" role="alert"><RotateCcw aria-hidden="true" /><p>RESOURCE MISMATCH · 资料版本不匹配</p><h1>We did not display the wrong material <small lang="zh-CN">没有显示错误的学习资料</small></h1></section></main>
    );
  }
  return <AdvancedNotesBody notes={payload} revision={state.resource.revision} visibleModuleIds={visibleModuleIds} />;
}

export function EsatAdvancedNotesPage({ services }: { readonly services: AppServices }) {
  const plan = loadEsatPreparationPlan(globalThis.localStorage);
  if (plan === null) return <EsatPlanRequiredState />;
  if (plan.curriculumId === null || plan.courseIds.length === 0) {
    return (
      <main className="advanced-notes-page"><SiteHeader examId="esat" /><section className="advanced-notes-state page-shell"><p>COURSE PROFILE REQUIRED · 需要课程档案</p><h1><EnglishFirstText english="Complete your course profile first" chinese="请先完成课程信息" /></h1><EnglishFirstParagraph english="Advanced notes are filtered by your selected ESAT modules and curriculum evidence." chinese="深度笔记会按你选择的 ESAT 模块和课程证据显示。" /><Link className="button button--primary" to="/exams/esat/profile">Complete course profile <small lang="zh-CN">填写课程信息</small></Link></section></main>
    );
  }
  return <AdvancedReviewNotesPage services={services} examId="esat" resourceId={ESAT_ADVANCED_NOTES_RESOURCE_ID} visibleModuleIds={plan.moduleIds} />;
}

export function TaraAdvancedNotesPage({ services }: { readonly services: AppServices }) {
  return <AdvancedReviewNotesPage services={services} examId="tara" resourceId={TARA_ADVANCED_NOTES_RESOURCE_ID} />;
}
