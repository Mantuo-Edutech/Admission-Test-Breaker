import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import type { GuestSpace } from "../../../platform/learning-space/domain.js";
import { EsatPlanRequiredState } from "../../catalog/components/EsatPlanRequiredState.js";
import { loadEsatPreparationPlan } from "../../catalog/esat-plan.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import type { DeliveredPracticePaper } from "../../practice/delivery/domain.js";
import type { AssessmentBackgroundProfile, AssessmentProfileExamId } from "../assessment-profile-domain.js";
import { PreparationProfileGate } from "./PreparationProfileGate.js";
import { AssessmentProfileRequiredState } from "./AssessmentProfileRequiredState.js";

function LoadingProfile() {
  return <main className="practice-state-page" aria-live="polite"><p className="eyebrow">CHECKING YOUR PROFILE</p><h1>Preparing your paper…<small lang="zh-CN">正在准备练习</small></h1></main>;
}

function EsatPracticeGate({ children }: { children: ReactNode }) {
  const plan = loadEsatPreparationPlan(globalThis.localStorage);
  if (plan === null) return <EsatPlanRequiredState />;
  if (plan.curriculumId === null || plan.courseIds.length === 0) {
    return (
      <main className="tmua-stage-page esat-stage-page">
        <SiteHeader examId="esat" />
        <section className="tmua-required-state page-shell">
          <p className="eyebrow">COURSE PROFILE</p>
          <h1>Complete your ESAT course profile<small lang="zh-CN">请先填写 ESAT 课程信息</small></h1>
          <p>Your programme and modules are set. Add your curriculum and courses so your practice record is mapped correctly.</p>
          <Link className="button button--primary" to="/exams/esat/profile">Complete course profile <small lang="zh-CN">填写课程信息</small></Link>
        </section>
      </main>
    );
  }
  return children;
}

function BackgroundProfileGate({ examId, services, children }: {
  examId: AssessmentProfileExamId;
  services: AppServices;
  children: ReactNode;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    guestSpace: GuestSpace | null;
    profile: AssessmentBackgroundProfile | null;
    issue: "corrupt" | "unsupported" | "unavailable" | null;
  }>({ loading: true, guestSpace: null, profile: null, issue: null });

  useEffect(() => {
    let active = true;
    void services.guestSpaceStore.loadOrCreate().then(async (guestSpace) => {
      const result = await services.assessmentProfileStore?.load(guestSpace.id, examId)
        ?? { profile: null, issue: null };
      if (active) setState({ loading: false, guestSpace, profile: result.profile, issue: result.issue });
    });
    return () => { active = false; };
  }, [examId, services.assessmentProfileStore, services.guestSpaceStore]);

  if (services.assessmentProfileStore === undefined) return children;
  if (state.loading) return <LoadingProfile />;
  if (state.profile === null || state.profile.examId !== examId) {
    return <AssessmentProfileRequiredState examId={examId} issue={state.issue} />;
  }
  return children;
}

export function ExamPracticeProfileGate({ services, children, paper: resolvedPaper }: {
  services: AppServices;
  children: ReactNode;
  paper: DeliveredPracticePaper | null;
}) {
  const paper = resolvedPaper;
  const examId = paper?.exam.toLowerCase();
  if (examId === "tmua") return <PreparationProfileGate services={services}>{children}</PreparationProfileGate>;
  if (examId === "esat") return <EsatPracticeGate>{children}</EsatPracticeGate>;
  if (examId === "tara" || examId === "lnat" || examId === "ucat") {
    return <BackgroundProfileGate examId={examId} services={services}>{children}</BackgroundProfileGate>;
  }
  return children;
}
