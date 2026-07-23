import { ArrowRight, BookOpenCheck, Clock3, GraduationCap, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import {
  buildAssessmentPreparationPlan,
  type AssessmentPreparationPlan,
} from "../assessment-preparation.js";
import type {
  AssessmentBackgroundProfile,
  AssessmentProfileExamId,
} from "../assessment-profile-domain.js";
import { AssessmentProfileRequiredState } from "../components/AssessmentProfileRequiredState.js";

const examNames: Record<AssessmentProfileExamId, string> = {
  tara: "TARA",
  lnat: "LNAT",
  ucat: "UCAT",
};

interface PreparationPageState {
  readonly loading: boolean;
  readonly profile: AssessmentBackgroundProfile | null;
  readonly issue: "corrupt" | "unsupported" | "unavailable" | null;
}

export function AssessmentPreparationPage({
  examId,
  services,
}: {
  readonly examId: AssessmentProfileExamId;
  readonly services: AppServices;
}) {
  const [state, setState] = useState<PreparationPageState>({
    loading: true,
    profile: null,
    issue: null,
  });
  const name = examNames[examId];

  useEffect(() => {
    let active = true;
    void services.guestSpaceStore.loadOrCreate().then(async (guestSpace) => {
      const result = await services.assessmentProfileStore?.load(guestSpace.id, examId)
        ?? { profile: null, issue: null };
      if (active) {
        setState({ loading: false, profile: result.profile, issue: result.issue });
      }
    });
    return () => { active = false; };
  }, [examId, services.assessmentProfileStore, services.guestSpaceStore]);

  if (state.loading) {
    return (
      <main className="tmua-stage-page assessment-preparation-page">
        <SiteHeader examId={examId} />
        <section className="practice-state-page" aria-live="polite">
          <p className="eyebrow">正在计算起点定位 · STARTING POINT</p>
          <h1>正在整理你的 {name} 准备路径…</h1>
        </section>
      </main>
    );
  }
  if (state.profile === null || state.profile.examId !== examId) {
    return <AssessmentProfileRequiredState examId={examId} issue={state.issue} />;
  }

  const plan: AssessmentPreparationPlan = buildAssessmentPreparationPlan(state.profile);
  return (
    <main className="tmua-stage-page assessment-preparation-page">
      <SiteHeader examId={examId} />
      <section className="assessment-preparation-hero page-shell">
        <div>
          <p className="eyebrow">第 2 步 · STARTING POINT</p>
          <h1>你的 {name} 起点定位<span>Your starting point, module by module</span></h1>
          <p>下面只回答“现有课程可以迁移什么、还要补什么、先花多少时间完成第一轮入门与短诊断”。结果由固定规则生成，不调用 AI。</p>
          <div className="assessment-preparation-hero__actions">
            <Link className="button button--primary" to={plan.nextActionHref}>
              {plan.nextActionLabel}<ArrowRight aria-hidden="true" />
            </Link>
            <Link className="button button--secondary" to={`/exams/${examId}/profile`}>修改背景信息</Link>
          </div>
        </div>
        <dl aria-label={`${name} 起点定位概览`}>
          <div><dt>课程体系</dt><dd>{plan.curriculumLabel}<span>{plan.learningStageLabel}</span></dd></div>
          <div><dt>第一轮建议</dt><dd>{plan.firstCycleHours[0]}–{plan.firstCycleHours[1]} 小时<span>入门、题型熟悉和短诊断，不是总训练时长</span></dd></div>
          <div><dt>按当前时间</dt><dd>{plan.firstCycleWeeks[0]}–{plan.firstCycleWeeks[1]} 周<span>{plan.weeklyTimeLabel}</span></dd></div>
        </dl>
      </section>

      <section className="assessment-preparation-evidence page-shell" aria-labelledby={`${examId}-evidence-title`}>
        <header>
          <div><GraduationCap aria-hidden="true" /><p>你的课程背景 · YOUR SUBJECTS</p></div>
          <h2 id={`${examId}-evidence-title`}>定位参考了这些已学学科</h2>
        </header>
        <ul>
          {plan.subjectLabels.map((subject) => <li key={subject}>{subject}</li>)}
        </ul>
        <p><ShieldCheck aria-hidden="true" />课程背景用于判断知识覆盖；完成在线诊断后，系统会加入你的速度、正确率和错误类型。</p>
      </section>

      <section className="assessment-preparation-modules page-shell" aria-labelledby={`${examId}-modules-title`}>
        <header className="section-heading">
          <p>逐模块定位 · MODULE MAP</p>
          <h2 id={`${examId}-modules-title`}>具体到每个模块：已有什么，还缺什么</h2>
          <span>“课程未显示覆盖”不等于你不会；它表示系统不能仅凭课程名称得出已掌握结论。</span>
        </header>
        <div className="assessment-preparation-modules__list">
          {plan.modules.map((module, index) => (
            <article key={module.id} data-status={module.status}>
              <header>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><p>{module.name}</p><h3>{module.nameZh}</h3></div>
                <strong>{module.statusLabel}</strong>
              </header>
              <div className="assessment-preparation-modules__body">
                <section>
                  <p>课程覆盖 · Course coverage</p>
                  <h4>{module.courseEvidence}</h4>
                  <span>{module.courseConclusion}</span>
                </section>
                <section>
                  <p>需要补充或确认 · What to add or confirm</p>
                  <ul>{module.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
                </section>
                <aside>
                  <Clock3 aria-hidden="true" />
                  <p>第一轮建议</p>
                  <strong>{module.suggestedHours[0]}–{module.suggestedHours[1]} 小时</strong>
                  <span>先理解题型与基础，再用短诊断验证</span>
                </aside>
              </div>
              <footer>
                <BookOpenCheck aria-hidden="true" />
                <span>下一步用在线练习结果更新定位</span>
                <Link to={module.practiceHref}>{module.practiceLabel}<ArrowRight aria-hidden="true" /></Link>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="assessment-preparation-next page-shell">
        <div>
          <p className="eyebrow">第 3 步 · FREE PRACTICE</p>
          <h2>现在进入免费在线练习</h2>
          <p>先完成一个模块。提交后系统才使用正确率、每题活跃用时和改答记录形成下一层事实报告。</p>
        </div>
        <Link className="button button--primary" to={plan.nextActionHref}>{plan.nextActionLabel}<ArrowRight aria-hidden="true" /></Link>
      </section>
    </main>
  );
}
