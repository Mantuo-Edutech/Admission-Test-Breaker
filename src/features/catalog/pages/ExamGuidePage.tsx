import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";
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
            {guide.title}
            <span>{guide.titleEnglish}</span>
          </h1>
          <p>{guide.introduction}</p>
          {(exam.id === "tara" || exam.id === "lnat" || exam.id === "ucat") && (
            <div className="tmua-overview-page__actions">
              <Link className="button button--primary" to={`${exam.href}/past-papers`}>查看免费在线练习</Link>
            </div>
          )}
        </div>
        <dl aria-label={`${exam.name} 考试概况`}>
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
          <p>考试结构 · FORMAT</p>
          <h2 id={`${exam.id}-format-title`}>你需要完成什么？</h2>
          <span>先看清模块、题量和计时，再决定从哪里开始。</span>
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
          <p>准备顺序 · PATH</p>
          <h2 id={`${exam.id}-path-title`}>按这个顺序开始</h2>
          <span>不先堆题量，先确定范围、题型和真实考试节奏。</span>
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
          <p>本站整理依据 · SOURCES DIGESTED</p>
          <h2 id={`${exam.id}-resources-title`}>官方资料已经整理进本站</h2>
          <span>学生无需离开本站寻找入口；原始来源、核验日期与权利状态保存在内部版本化清单。</span>
        </header>
        <div className="exam-guide-resources__grid">
          {guide.officialLinks.map((resource) => (
            <article key={resource.href}>
              <FileText aria-hidden="true" />
              <div><h3>{resource.label}</h3><p>{resource.description}</p><span>已纳入本站来源清单</span></div>
              <CheckCircle2 aria-hidden="true" />
            </article>
          ))}
        </div>
        <p className="exam-guide-resources__boundary">
          <ShieldCheck aria-hidden="true" />
          本站保留来源可追溯性，但不会把外部链接当作产品；在线题库只使用满托原创、已授权或完成独立权利核验的内容。
        </p>
      </section>
    </main>
  );
}
