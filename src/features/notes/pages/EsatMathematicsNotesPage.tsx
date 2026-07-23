import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { EsatPlanRequiredState } from "../../catalog/components/EsatPlanRequiredState.js";
import { loadEsatPreparationPlan } from "../../catalog/esat-plan.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { ESAT_MATHEMATICS_REVIEW_NOTES } from "../content/esat-review-notes.js";
import { ReviewNotesPage } from "./ReviewNotesPage.js";

export function EsatMathematicsNotesPage() {
  const plan = loadEsatPreparationPlan(globalThis.localStorage);
  if (plan === null) return <EsatPlanRequiredState />;
  if (plan.curriculumId === null || plan.courseIds.length === 0) {
    return (
      <main className="tmua-stage-page esat-stage-page">
        <SiteHeader examId="esat" />
        <section className="tmua-required-state page-shell">
          <p className="eyebrow">COURSE PROFILE REQUIRED</p>
          <h1>请先完成 ESAT 课程档案</h1>
          <p>笔记会按你的专业模块和课程体系显示；先填写课程，才能区分复习与补学。</p>
          <Link className="button button--primary" to="/exams/esat/profile">填写课程信息<ArrowRight aria-hidden="true" /></Link>
        </section>
      </main>
    );
  }

  return (
    <ReviewNotesPage
      notes={ESAT_MATHEMATICS_REVIEW_NOTES}
      examId="esat"
      visibleModuleIds={plan.moduleIds}
      coverageHref="/exams/esat/coverage"
      practiceHref="/exams/esat/past-papers"
      moduleCountLabel="个与你当前路径相关的数学模块"
      moduleEyebrow="ESAT MATHEMATICS"
      moduleSectionLabel="当前 ESAT 数学复习模块"
      practiceActionLabel="进入 ESAT 数学在线练习"
      coverageActionLabel="查看我的课程缺口"
      downloadHref="/notes/esat/esat-mathematics-foundations-v1.pdf"
    />
  );
}
