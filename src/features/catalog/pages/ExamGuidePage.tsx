import { CheckCircle2, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { getExamGuide } from "../exam-guides.js";
import type { ExamCatalogEntry } from "../exams.js";

interface ExamGuidePageProps {
  exam: ExamCatalogEntry;
}

export function ExamGuidePage({ exam }: ExamGuidePageProps) {
  const guide = getExamGuide(exam.id);
  if (guide === null) return null;

  return (
    <main className="exam-guide-page">
      <SiteHeader examId={exam.id} />

      <section className="exam-guide-hero page-shell">
        <div>
          <p className="eyebrow">{guide.eyebrow}</p>
          <h1>
            {guide.titleEnglish}
            <span lang="zh-CN">{guide.title}</span>
          </h1>
          <p>{guide.introduction}</p>
          {(exam.id === "tara" || exam.id === "lnat" || exam.id === "ucat") && (
            <div className="tmua-overview-page__actions">
              <Link className="button button--primary" to={`${exam.href}/past-papers`}>Open free online practice</Link>
            </div>
          )}
        </div>
        <dl aria-label={`${exam.name} test overview`}>
          {guide.metrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd><strong>{metric.value}</strong><span>{metric.detail}</span></dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="exam-guide-section page-shell" id="format" aria-labelledby={`${exam.id}-format-title`}>
        <header className="section-heading">
          <p>TEST FORMAT</p>
          <h2 id={`${exam.id}-format-title`}>What will you complete?</h2>
          <span>Modules, question counts and timing<small lang="zh-CN">模块、题量与计时</small></span>
        </header>
        <div className="exam-guide-modules">
          {guide.modules.map((module, index) => (
            <article key={module.name}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{module.name}</h3>
              <p>{module.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="exam-guide-section exam-guide-path page-shell" id="path" aria-labelledby={`${exam.id}-path-title`}>
        <header className="section-heading">
          <p>PREPARATION PATH</p>
          <h2 id={`${exam.id}-path-title`}>Start in this order</h2>
          <span>Understand the scope and question types, then complete a full mock.<small lang="zh-CN">先理解范围和题型，再进入完整模考</small></span>
        </header>
        <ol>
          {guide.preparationSteps.map((step, index) => (
            <li key={step}>
              <CheckCircle2 aria-hidden="true" />
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="exam-guide-section exam-guide-resources page-shell" id="resources" aria-labelledby={`${exam.id}-resources-title`}>
        <header className="section-heading">
          <p>ALL IN ONE PLACE</p>
          <h2 id={`${exam.id}-resources-title`}>Everything you need next</h2>
          <span>Coverage, practice and review<small lang="zh-CN">定位、练习与复习</small></span>
        </header>
        <div className="exam-guide-resources__grid">
          <article>
            <FileText aria-hidden="true" />
            <div><h3>Course coverage</h3><p>Map your course background to the test modules and identify knowledge gaps.</p><Link to={`${exam.href}/preparation`}>View coverage</Link></div>
            <CheckCircle2 aria-hidden="true" />
          </article>
          <article>
            <FileText aria-hidden="true" />
            <div><h3>Online papers and full mocks</h3><p>Time, flag, submit and review complete papers inside the platform.</p><Link to={`${exam.href}/past-papers`}>Open practice</Link></div>
            <CheckCircle2 aria-hidden="true" />
          </article>
          <article>
            <FileText aria-hidden="true" />
            <div><h3>Review Notes</h3><p>Review core knowledge, common errors and methods by test module.</p><Link to={`${exam.href}/resources`}>Open notes</Link></div>
            <CheckCircle2 aria-hidden="true" />
          </article>
        </div>
      </section>
    </main>
  );
}
