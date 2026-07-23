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
          <p>完整准备 · ALL IN ONE PLACE</p>
          <h2 id={`${exam.id}-resources-title`}>接下来需要的内容都在这里</h2>
          <span>了解考试后，继续完成定位、在线练习和针对性复习。</span>
        </header>
        <div className="exam-guide-resources__grid">
          <article>
            <FileText aria-hidden="true" />
            <div><h3>考试与课程定位</h3><p>根据申请方向和课程背景，确认考试模块与知识缺口。</p><Link to={exam.href}>进入 {exam.name} 概览</Link></div>
            <CheckCircle2 aria-hidden="true" />
          </article>
          <article>
            <FileText aria-hidden="true" />
            <div><h3>在线题库与模拟练习</h3><p>直接在系统内完成计时、标记、提交和结果回顾。</p><Link to={`${exam.href}/past-papers`}>查看在线练习</Link></div>
            <CheckCircle2 aria-hidden="true" />
          </article>
          <article>
            <FileText aria-hidden="true" />
            <div><h3>Review Notes</h3><p>按照考试模块复习核心知识、常见错误与解题方法。</p><Link to={`${exam.href}/resources`}>查看复习资料</Link></div>
            <CheckCircle2 aria-hidden="true" />
          </article>
        </div>
      </section>
    </main>
  );
}
