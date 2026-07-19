import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { EsatPlanRequiredState } from "../../catalog/components/EsatPlanRequiredState.js";
import { loadEsatPreparationPlan } from "../../catalog/esat-plan.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { ESAT_SCIENCE_REVIEW_NOTES } from "../content/esat-review-notes.js";
import { ReviewNotesPage } from "./ReviewNotesPage.js";

const scienceModuleIds = new Set(["physics", "chemistry", "biology"]);

export function EsatScienceNotesPage() {
  const plan = loadEsatPreparationPlan(globalThis.localStorage);
  if (plan === null) return <EsatPlanRequiredState />;
  if (plan.curriculumId === null || plan.courseIds.length === 0) {
    return (
      <main className="tmua-stage-page esat-stage-page">
        <SiteHeader examId="esat" />
        <section className="tmua-required-state page-shell">
          <p className="eyebrow">COURSE PROFILE REQUIRED</p>
          <h1>请先完成 ESAT 课程档案</h1>
          <p>理科笔记会按你的专业模块和课程体系显示；先填写课程，才能区分复习、确认与补学。</p>
          <Link className="button button--primary" to="/exams/esat/profile">填写课程信息<ArrowRight aria-hidden="true" /></Link>
        </section>
      </main>
    );
  }

  const visibleModuleIds = plan.moduleIds.filter((moduleId) => scienceModuleIds.has(moduleId));
  if (visibleModuleIds.length === 0) {
    return (
      <main className="tmua-stage-page esat-stage-page">
        <SiteHeader examId="esat" />
        <section className="tmua-required-state page-shell">
          <p className="eyebrow">PROGRAMME MODULES CHECKED</p>
          <h1>你的专业不需要理科模块</h1>
          <p>当前专业组合没有要求 Physics、Chemistry 或 Biology；不需要为了看到更多内容而额外学习这些模块。</p>
          <div className="tmua-overview-page__actions">
            <Link className="button button--primary" to="/exams/esat/notes/mathematics">打开数学复习笔记<ArrowRight aria-hidden="true" /></Link>
            <Link className="button button--secondary" to="/exams/esat/dashboard">返回我的准备</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <ReviewNotesPage
      notes={ESAT_SCIENCE_REVIEW_NOTES}
      examId="esat"
      visibleModuleIds={visibleModuleIds}
      coverageHref="/exams/esat/coverage"
      practiceHref="/exams/esat/past-papers"
      moduleCountLabel="个与你当前专业相关的理科模块"
      moduleEyebrow="ESAT SCIENCE"
      moduleSectionLabel="当前 ESAT 理科复习模块"
      practiceActionLabel="进入 ESAT 理科模块在线练习"
      coverageActionLabel="查看我的课程缺口"
      downloadHref="/notes/esat/esat-sciences-foundations-v1.pdf"
    />
  );
}
