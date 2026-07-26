import type { AppServices } from "../../../app/dependencies.js";
import { TARA_REVIEW_NOTES } from "../content/tara-review-notes.js";
import { AssessmentReviewNotesPage } from "./AssessmentReviewNotesPage.js";

export function TaraReviewNotesPage({ services }: { readonly services: AppServices }) {
  return (
    <AssessmentReviewNotesPage
      examId="tara"
      services={services}
      notes={TARA_REVIEW_NOTES}
      preparationHref="/exams/tara/preparation"
      practiceHref="/exams/tara/past-papers"
      moduleCountLabel="个推理、写作与语言桥接模块"
      moduleCountLabelEn="reasoning, writing and language-bridge modules"
      moduleEyebrow="TARA REASONING & WRITING"
      moduleSectionLabel="TARA 推理与写作复习模块"
      moduleSectionLabelEn="TARA reasoning and writing review modules"
      practiceActionLabel="进入 TARA 在线练习"
      practiceActionLabelEn="Practise TARA online"
      downloadHref="/notes/tara/tara-reasoning-writing-foundations-v1.pdf"
    />
  );
}
