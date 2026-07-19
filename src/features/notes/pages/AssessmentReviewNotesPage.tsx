import { useEffect, useState } from "react";
import type { AppServices } from "../../../app/dependencies.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import type {
  AssessmentBackgroundProfile,
  AssessmentProfileExamId,
} from "../../preparation-profile/assessment-profile-domain.js";
import { AssessmentProfileRequiredState } from "../../preparation-profile/components/AssessmentProfileRequiredState.js";
import type { ReviewNotesDocument } from "../content/review-notes.js";
import { ReviewNotesPage } from "./ReviewNotesPage.js";

interface AssessmentReviewNotesPageProps {
  readonly examId: AssessmentProfileExamId;
  readonly services: AppServices;
  readonly notes: ReviewNotesDocument;
  readonly preparationHref: string;
  readonly practiceHref: string;
  readonly moduleCountLabel: string;
  readonly moduleEyebrow: string;
  readonly moduleSectionLabel: string;
  readonly practiceActionLabel: string;
  readonly downloadHref: string;
}

interface ProfileState {
  readonly loading: boolean;
  readonly profile: AssessmentBackgroundProfile | null;
  readonly issue: "corrupt" | "unsupported" | "unavailable" | null;
}

export function AssessmentReviewNotesPage({
  examId,
  services,
  notes,
  preparationHref,
  practiceHref,
  moduleCountLabel,
  moduleEyebrow,
  moduleSectionLabel,
  practiceActionLabel,
  downloadHref,
}: AssessmentReviewNotesPageProps) {
  const [state, setState] = useState<ProfileState>({
    loading: true,
    profile: null,
    issue: null,
  });

  useEffect(() => {
    let active = true;
    void services.guestSpaceStore.loadOrCreate().then(async (guestSpace) => {
      const result = await services.assessmentProfileStore?.load(guestSpace.id, examId)
        ?? { profile: null, issue: null };
      if (active) setState({ loading: false, profile: result.profile, issue: result.issue });
    });
    return () => { active = false; };
  }, [examId, services.assessmentProfileStore, services.guestSpaceStore]);

  if (state.loading) {
    return (
      <main className="tmua-stage-page">
        <SiteHeader examId={examId} />
        <section className="practice-state-page" aria-live="polite">
          <p className="eyebrow">正在检查本人档案 · PROFILE FIRST</p>
          <h1>正在准备复习笔记…</h1>
        </section>
      </main>
    );
  }

  if (state.profile === null || state.profile.examId !== examId) {
    return <AssessmentProfileRequiredState examId={examId} issue={state.issue} />;
  }

  return (
    <ReviewNotesPage
      notes={notes}
      examId={examId}
      coverageHref={preparationHref}
      practiceHref={practiceHref}
      moduleCountLabel={moduleCountLabel}
      moduleEyebrow={moduleEyebrow}
      moduleSectionLabel={moduleSectionLabel}
      practiceActionLabel={practiceActionLabel}
      coverageActionLabel="查看我的起点定位"
      downloadHref={downloadHref}
    />
  );
}
