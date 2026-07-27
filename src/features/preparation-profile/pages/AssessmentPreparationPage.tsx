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
          <p className="eyebrow">BUILDING YOUR STARTING POINT</p>
          <h1>Mapping your {name} preparation…<small lang="zh-CN">正在整理准备路径</small></h1>
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
          <p className="eyebrow">STARTING POINT</p>
          <h1>Your {name} starting point<span lang="zh-CN">你的起点定位</span></h1>
          <p>See what transfers from your current courses, what you still need to learn and how long a first review cycle may take. This uses fixed rules, not live AI.</p>
          <div className="assessment-preparation-hero__actions">
            <Link className="button button--primary" to={plan.nextActionHref}>
              {plan.nextActionLabel}<ArrowRight aria-hidden="true" />
            </Link>
            <Link className="button button--secondary" to={`/exams/${examId}/profile`}>Edit profile</Link>
          </div>
        </div>
        <dl aria-label={`${name} starting point summary`}>
          <div><dt>CURRICULUM</dt><dd>{plan.curriculumLabel}<span>{plan.learningStageLabel}</span></dd></div>
          <div><dt>FIRST REVIEW CYCLE</dt><dd>{plan.firstCycleHours[0]}–{plan.firstCycleHours[1]} hours<span>Foundation review and test-format work</span></dd></div>
          <div><dt>AT YOUR CURRENT PACE</dt><dd>{plan.firstCycleWeeks[0]}–{plan.firstCycleWeeks[1]} weeks<span>{plan.weeklyTimeLabel}</span></dd></div>
        </dl>
      </section>

      <section className="assessment-preparation-evidence page-shell" aria-labelledby={`${examId}-evidence-title`}>
        <header>
          <div><GraduationCap aria-hidden="true" /><p>YOUR SUBJECTS</p></div>
          <h2 id={`${examId}-evidence-title`}>Courses used for this map<small lang="zh-CN">定位参考的已学课程</small></h2>
        </header>
        <ul>
          {plan.subjectLabels.map((subject) => <li key={subject}>{subject}</li>)}
        </ul>
        <p><ShieldCheck aria-hidden="true" />Your course background maps knowledge coverage. Full-paper results add accuracy, timing and error patterns.</p>
      </section>

      <section className="assessment-preparation-modules page-shell" aria-labelledby={`${examId}-modules-title`}>
        <header className="section-heading">
          <p>MODULE MAP</p>
          <h2 id={`${examId}-modules-title`}>What transfers and what is missing</h2>
          <span>Course coverage is not proof of what you personally can or cannot do.<small lang="zh-CN">课程未显示覆盖，并不等于你不会</small></span>
        </header>
        <div className="assessment-preparation-modules__list">
          {plan.modules.map((module, index) => (
            <article key={module.id} data-status={module.status}>
              <header>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{module.name}</h3><small lang="zh-CN">{module.nameZh}</small></div>
                <strong>{module.statusLabel}</strong>
              </header>
              <div className="assessment-preparation-modules__body">
                <section>
                  <p>COURSE COVERAGE</p>
                  <h4>{module.courseEvidence}</h4>
                  <span>{module.courseConclusion}</span>
                </section>
                <section>
                  <p>WHAT TO LEARN OR VERIFY</p>
                  <ul>{module.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
                </section>
                <aside>
                  <Clock3 aria-hidden="true" />
                  <p>FIRST REVIEW CYCLE</p>
                  <strong>{module.suggestedHours[0]}–{module.suggestedHours[1]} hours</strong>
                  <span>Build the foundation, then verify it in a full paper</span>
                </aside>
              </div>
              <footer>
                <BookOpenCheck aria-hidden="true" />
                <span>Update this map with full-paper results</span>
                <Link to={module.practiceHref}>{module.practiceLabel}<ArrowRight aria-hidden="true" /></Link>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="assessment-preparation-next page-shell">
        <div>
          <p className="eyebrow">FREE ONLINE PRACTICE</p>
          <h2>Continue with a full paper<small lang="zh-CN">进入完整在线练习</small></h2>
          <p>After submission, your accuracy, active time and answer changes become part of your learning record.</p>
        </div>
        <Link className="button button--primary" to={plan.nextActionHref}>{plan.nextActionLabel}<ArrowRight aria-hidden="true" /></Link>
      </section>
    </main>
  );
}
