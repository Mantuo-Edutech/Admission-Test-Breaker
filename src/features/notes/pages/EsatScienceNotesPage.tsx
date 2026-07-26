import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { EsatPlanRequiredState } from "../../catalog/components/EsatPlanRequiredState.js";
import { loadEsatPreparationPlan } from "../../catalog/esat-plan.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { EnglishFirstParagraph, EnglishFirstText } from "../components/EnglishFirstText.js";
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
          <h1><EnglishFirstText english="Complete your ESAT course profile first" chinese="请先完成 ESAT 课程档案" /></h1>
          <EnglishFirstParagraph english="Science notes follow your required modules and curriculum, separating revision, verification and new learning." chinese="理科笔记会按你的专业模块和课程体系显示；先填写课程，才能区分复习、确认与补学。" />
          <Link className="button button--primary" to="/exams/esat/profile"><EnglishFirstText english="Complete course profile" chinese="填写课程信息" /><ArrowRight aria-hidden="true" /></Link>
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
          <h1><EnglishFirstText english="Your programme does not require a science module" chinese="你的专业不需要理科模块" /></h1>
          <EnglishFirstParagraph english="Your current programme requires none of Physics, Chemistry or Biology, so there is no reason to study them merely to unlock more content." chinese="当前专业组合没有要求 Physics、Chemistry 或 Biology；不需要为了看到更多内容而额外学习这些模块。" />
          <div className="tmua-overview-page__actions">
            <Link className="button button--primary" to="/exams/esat/notes/mathematics"><EnglishFirstText english="Open mathematics notes" chinese="打开数学复习笔记" /><ArrowRight aria-hidden="true" /></Link>
            <Link className="button button--secondary" to="/exams/esat/resources"><EnglishFirstText english="Back to review notes" chinese="返回复习笔记" /></Link>
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
      moduleCountLabelEn="science modules required for your programme"
      moduleEyebrow="ESAT SCIENCE"
      moduleSectionLabel="当前 ESAT 理科复习模块"
      moduleSectionLabelEn="Your ESAT science review modules"
      practiceActionLabel="进入 ESAT 理科模块在线练习"
      practiceActionLabelEn="Practise your ESAT science modules"
      coverageActionLabel="查看我的课程缺口"
      coverageActionLabelEn="View my curriculum gaps"
      downloadHref="/notes/esat/esat-sciences-foundations-v1.pdf"
    />
  );
}
