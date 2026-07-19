import { BookOpenCheck, FileText, LibraryBig, Map } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { ESAT_MODULE_LABELS } from "../esat-admissions.js";
import { loadEsatPreparationPlan } from "../esat-plan.js";

export function EsatDashboardPage() {
  const plan = useMemo(() => loadEsatPreparationPlan(globalThis.localStorage), []);
  const nextHref = plan === null ? "/exams/esat" : plan.curriculumId === null ? "/exams/esat/profile" : "/exams/esat/coverage";
  const nextTitle = plan === null ? "先选择申请专业" : plan.curriculumId === null ? "填写你的课程信息" : "查看知识覆盖结果";
  const nextAction = plan === null ? "选择学校和专业" : plan.curriculumId === null ? "填写课程信息" : "查看知识覆盖";

  return (
    <main className="tmua-stage-page esat-stage-page esat-dashboard-page">
      <SiteHeader examId="esat" />
      <section className="tmua-stage-hero tmua-dashboard-hero page-shell">
        <div>
          <p className="eyebrow">你的 ESAT 准备</p>
          <h1>{nextTitle}</h1>
          {plan !== null && <p>{plan.moduleIds.map((id) => ESAT_MODULE_LABELS[id]).join(" · ")}</p>}
        </div>
        <Link to="/exams/esat">修改专业</Link>
      </section>

      <section className="tmua-dashboard-primary page-shell" aria-label="推荐下一步">
        <article className="tmua-dashboard-card tmua-dashboard-card--recommended">
          <div className="tmua-dashboard-card__meta"><BookOpenCheck aria-hidden="true" /><span>下一步</span></div>
          <h2>{nextTitle}</h2>
          <Link className="button button--primary" to={nextHref}>{nextAction}</Link>
        </article>
      </section>

      <section className="tmua-dashboard-secondary page-shell" aria-labelledby="esat-dashboard-content-title">
        <header className="section-heading section-heading--compact">
          <p>你的内容</p>
          <h2 id="esat-dashboard-content-title">按所选模块继续准备</h2>
        </header>
        <div className="tmua-dashboard-grid">
          <article className="tmua-dashboard-card">
            <div className="tmua-dashboard-card__meta"><Map aria-hidden="true" /><span>课程对照</span></div>
            <h2>知识覆盖</h2>
            <p>查看每个必考模块已经覆盖、部分覆盖和需要确认的知识。</p>
            <Link className="button button--secondary" to="/exams/esat/coverage">查看知识覆盖</Link>
          </article>
          <article className="tmua-dashboard-card">
            <div className="tmua-dashboard-card__meta"><LibraryBig aria-hidden="true" /><span>按模块整理</span></div>
            <h2>历年真题</h2>
            <p>只查看与你的模块相关的 ENGAA 和 NSAA 历年题。</p>
            <Link className="button button--secondary" to="/exams/esat/past-papers">查看真题入口</Link>
          </article>
          <article className="tmua-dashboard-card">
            <div className="tmua-dashboard-card__meta"><FileText aria-hidden="true" /><span>3 项真实产品</span></div>
            <h2>题库与学习资料</h2>
            <p>汇总专业定位、课程覆盖和五模块原创短诊断；只展示已经能在本站打开的内容。</p>
            <Link className="button button--secondary" to="/exams/esat/resources">查看题库与资料</Link>
          </article>
        </div>
      </section>
    </main>
  );
}
