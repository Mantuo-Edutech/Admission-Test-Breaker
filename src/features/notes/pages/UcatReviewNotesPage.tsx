import type { AppServices } from "../../../app/dependencies.js";
import { UCAT_REVIEW_NOTES } from "../content/ucat-review-notes.js";
import { AssessmentReviewNotesPage } from "./AssessmentReviewNotesPage.js";

export function UcatReviewNotesPage({ services }: { readonly services: AppServices }) {
  return (
    <AssessmentReviewNotesPage
      examId="ucat"
      services={services}
      notes={UCAT_REVIEW_NOTES}
      preparationHref="/exams/ucat/preparation"
      practiceHref="/exams/ucat/past-papers"
      moduleCountLabel="个四模块与工具节奏模块"
      moduleCountLabelEn="subtest, tool and pacing modules"
      moduleEyebrow="UCAT FOUR SUBTESTS & PACING"
      moduleSectionLabel="UCAT 四模块与极限节奏复习模块"
      moduleSectionLabelEn="UCAT subtest and pacing review modules"
      practiceActionLabel="进入 UCAT 在线练习"
      practiceActionLabelEn="Practise UCAT online"
      downloadHref="/notes/ucat/ucat-four-subtest-foundations-v1.pdf"
    />
  );
}
