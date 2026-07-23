import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import type { GuestSpace } from "../../../platform/learning-space/domain.js";
import { EsatPlanRequiredState } from "../../catalog/components/EsatPlanRequiredState.js";
import { loadEsatPreparationPlan } from "../../catalog/esat-plan.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { getPracticePaper } from "../../practice/content/practice-paper-registry.js";
import type { PracticePaper } from "../../practice/content/types.js";
import type { AssessmentBackgroundProfile, AssessmentProfileExamId } from "../assessment-profile-domain.js";
import { PreparationProfileGate } from "./PreparationProfileGate.js";
import { AssessmentProfileRequiredState } from "./AssessmentProfileRequiredState.js";

function LoadingProfile() {
  return <main className="practice-state-page" aria-live="polite"><p className="eyebrow">正在检查本人档案</p><h1>正在准备练习…</h1></main>;
}

function EsatPracticeGate({ children }: { children: ReactNode }) {
  const plan = loadEsatPreparationPlan(globalThis.localStorage);
  if (plan === null) return <EsatPlanRequiredState />;
  if (plan.curriculumId === null || plan.courseIds.length === 0) {
    return (
      <main className="tmua-stage-page esat-stage-page">
        <SiteHeader examId="esat" />
        <section className="tmua-required-state page-shell">
          <p className="eyebrow">第 2 步 · COURSE PROFILE</p>
          <h1>请先填写 ESAT 课程信息</h1>
          <p>专业与模块已经确定；填写课程体系和具体课程后，系统会保存对应的练习记录。</p>
          <Link className="button button--primary" to="/exams/esat/profile">填写课程信息</Link>
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
  paper?: PracticePaper | null;
}) {
  const { paperId } = useParams();
  const paper = resolvedPaper === undefined
    ? paperId === undefined ? null : getPracticePaper(paperId)
    : resolvedPaper;
  const examId = paper?.exam.toLowerCase();
  if (examId === "tmua") return <PreparationProfileGate services={services}>{children}</PreparationProfileGate>;
  if (examId === "esat") return <EsatPracticeGate>{children}</EsatPracticeGate>;
  if (examId === "tara" || examId === "lnat" || examId === "ucat") {
    return <BackgroundProfileGate examId={examId} services={services}>{children}</BackgroundProfileGate>;
  }
  return children;
}
