import type { AppServices } from "../../../app/dependencies.js";
import { LNAT_REVIEW_NOTES } from "../content/lnat-review-notes.js";
import { AssessmentReviewNotesPage } from "./AssessmentReviewNotesPage.js";

export function LnatReviewNotesPage({ services }: { readonly services: AppServices }) {
  return (
    <AssessmentReviewNotesPage
      examId="lnat"
      services={services}
      notes={LNAT_REVIEW_NOTES}
      preparationHref="/exams/lnat/preparation"
      practiceHref="/exams/lnat/past-papers"
      moduleCountLabel="个阅读、写作、语言与节奏模块"
      moduleCountLabelEn="reading, writing, language and pacing modules"
      moduleEyebrow="LNAT ARGUMENT READING & WRITING"
      moduleSectionLabel="LNAT 论证阅读与写作复习模块"
      moduleSectionLabelEn="LNAT argument reading and writing modules"
      practiceActionLabel="进入 LNAT 在线练习"
      practiceActionLabelEn="Practise LNAT online"
      downloadHref="/notes/lnat/lnat-reading-writing-foundations-v1.pdf"
    />
  );
}
