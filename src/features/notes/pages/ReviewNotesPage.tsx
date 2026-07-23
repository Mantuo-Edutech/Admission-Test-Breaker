import { BookOpenCheck, Check, Download, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { ExamId } from "../../catalog/exams.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { MathContent } from "../../practice/components/MathContent.js";
import type {
  ReviewNotesDocument,
  ReviewNotesFormula,
} from "../content/review-notes.js";

function Formula({ value }: { readonly value: ReviewNotesFormula }) {
  return <MathContent blocks={[{ kind: "display-math", tex: value.tex }]} />;
}

interface ReviewNotesPageProps {
  readonly notes: ReviewNotesDocument;
  readonly examId: ExamId;
  readonly visibleModuleIds?: readonly string[];
  readonly coverageHref: string;
  readonly practiceHref: string;
  readonly moduleCountLabel: string;
  readonly moduleEyebrow: string;
  readonly moduleSectionLabel: string;
  readonly practiceActionLabel: string;
  readonly coverageActionLabel: string;
  readonly downloadHref?: string;
}

export function ReviewNotesPage({
  notes,
  examId,
  visibleModuleIds,
  coverageHref,
  practiceHref,
  moduleCountLabel,
  moduleEyebrow,
  moduleSectionLabel,
  practiceActionLabel,
  coverageActionLabel,
  downloadHref,
}: ReviewNotesPageProps) {
  const visibleModules = visibleModuleIds === undefined
    ? notes.modules
    : notes.modules.filter((module) => visibleModuleIds.includes(module.id));

  return (
    <main className="review-notes-page">
      <SiteHeader examId={examId} />

      <section className="review-notes-hero page-shell">
        <div>
          <p className="eyebrow">{notes.authorship} · V{notes.version}</p>
          <h1>{notes.titleZh}<span>{notes.titleEn}</span></h1>
          <p>{notes.subtitleZh}</p>
          <small>{notes.subtitleEn}</small>
          <div className="review-notes-hero__actions">
            <a className="button button--primary" href="#review-notes-modules">开始阅读</a>
            <Link className="button button--secondary" to={coverageHref}>{coverageActionLabel}</Link>
            {downloadHref !== undefined && (
              <a className="button button--secondary" href={downloadHref} download>
                下载 A4 PDF<Download aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
        <aside aria-label="当前笔记版本边界">
          <span>TEACHING PREVIEW</span>
          <strong>{visibleModules.length}</strong>
          <p>{moduleCountLabel}</p>
          <small>{notes.examCycle}</small>
        </aside>
      </section>

      <nav className="review-notes-toc page-shell" aria-label="复习笔记目录">
        <span>CONTENTS</span>
        <a href="#review-notes-exam-map">考试地图</a>
        <a href="#review-notes-curriculum">课程桥接</a>
        {visibleModules.map((module) => <a key={module.id} href={`#review-notes-${module.id}`}>{module.titleEn}</a>)}
        <a href="#review-notes-next-action">复盘与下一步</a>
      </nav>

      <section className="review-notes-scope page-shell" aria-labelledby="review-notes-scope-title">
        <div>
          <p className="eyebrow">本版包含 · INCLUDED</p>
          <h2 id="review-notes-scope-title">这份笔记现在能帮你完成什么？</h2>
          <p>{notes.scope.includedZh}</p>
        </div>
        <div>
          <p className="eyebrow">仍待完成 · REMAINING</p>
          <p>{notes.scope.remainingZh}</p>
        </div>
      </section>

      <section className="review-notes-section page-shell" id="review-notes-exam-map" aria-labelledby="review-notes-map-title">
        <header>
          <p>01 · EXAM MAP</p>
          <h2 id="review-notes-map-title">先看清所选模块怎样运行<span>Understand the Test Before Revising</span></h2>
        </header>
        <div className="review-notes-facts">
          {notes.examFacts.map((fact) => (
            <article key={fact.labelEn}>
              <span>{fact.labelEn}</span>
              <h3>{fact.labelZh}</h3>
              <p>{fact.valueZh}</p>
              <small>{fact.valueEn}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="review-notes-section page-shell" id="review-notes-curriculum" aria-labelledby="review-notes-curriculum-title">
        <header>
          <p>02 · CURRICULUM BRIDGE</p>
          <h2 id="review-notes-curriculum-title">你学过的课程，哪些能直接迁移？<span>What Transfers — and What Still Needs Checking?</span></h2>
          <small>这是课程范围判断；请结合本人课程档案和在线练习结果安排复习。</small>
        </header>
        <div className="review-notes-curricula">
          {notes.curriculumBridges.map((bridge) => (
            <article key={bridge.curriculum}>
              <span className={`review-notes-status review-notes-status--${bridge.status}`}>{bridge.statusZh}</span>
              <h3>{bridge.curriculum}</h3>
              <div><h4><Check aria-hidden="true" />通常可以迁移</h4><ul>{bridge.likelyCoveredZh.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <div><h4>需要逐项确认</h4><ul>{bridge.confirmZh.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <p><strong>第一步：</strong>{bridge.firstActionZh}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="review-notes-modules page-shell" id="review-notes-modules" aria-label={moduleSectionLabel}>
        {visibleModules.map((module) => (
          <article className="review-notes-module" id={`review-notes-${module.id}`} key={module.id}>
            <header>
              <span>{module.number}</span>
              <div><p>{moduleEyebrow}</p><h2>{module.titleZh}<small>{module.titleEn}</small></h2><p>{module.summaryZh}</p></div>
              <aside><strong>学完你应当能够</strong><ul>{module.learningOutcomes.map((item) => <li key={item}>{item}</li>)}</ul></aside>
            </header>

            <section className="review-notes-units" aria-label={`${module.titleEn} 知识单元`}>
              <header><p>KNOWLEDGE MAP</p><h3>逐项核对知识单元</h3></header>
              <ol>{module.knowledgeUnits.map((unit) => <li key={unit.id}><span>{unit.code}</span><strong>{unit.labelZh}</strong><small>{unit.labelEn}</small></li>)}</ol>
            </section>

            <section className="review-notes-methods" aria-label={`${module.titleEn} 解题方法`}>
              <header><p>QUESTION METHODS</p><h3>看到什么，怎样开始，如何检查</h3></header>
              <div>{module.methods.map((method, index) => (
                <article key={method.nameEn}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h4>{method.nameZh}<small>{method.nameEn}</small></h4>
                  <dl><div><dt>识别信号</dt><dd>{method.signalZh}</dd></div><div><dt>标准动作</dt><dd>{method.methodZh}</dd></div><div><dt>最后检查</dt><dd>{method.checkZh}</dd></div></dl>
                </article>
              ))}</div>
            </section>

            {module.originalWorkedExamples.map((example) => (
              <section className="review-notes-example" key={example.id}>
                <header><span>ORIGINAL WORKED EXAMPLE</span><h3>{example.titleZh}<small>{example.titleEn}</small></h3></header>
                <div className="review-notes-example__problem"><strong>题目 / Problem</strong><p>{example.problemZh}</p><small>{example.problemEn}</small></div>
                <ol>{example.steps.map((step) => <li key={step.labelZh}><strong>{step.labelZh}</strong><p>{step.bodyZh}</p>{step.math !== undefined && <Formula value={step.math} />}</li>)}</ol>
                <div className="review-notes-example__conclusion"><p><strong>结论：</strong>{example.answerZh}</p><p><strong>常见误区：</strong>{example.trapZh}</p></div>
              </section>
            ))}

            <section className="review-notes-recall" aria-label={`${module.titleEn} 主动回忆`}>
              <header><BookOpenCheck aria-hidden="true" /><div><p>ACTIVE RECALL</p><h3>合上笔记再回答</h3></div></header>
              {module.activeRecall.map((item) => (
                <details key={item.promptEn}><summary><strong>{item.promptZh}</strong><small>{item.promptEn}</small></summary><p>{item.answerZh}</p><small>{item.answerEn}</small></details>
              ))}
            </section>
          </article>
        ))}
      </section>

      <section className="review-notes-next page-shell" id="review-notes-next-action" aria-labelledby="review-notes-next-title">
        <header><p>03 · REVIEW LOOP</p><h2 id="review-notes-next-title">把复习变成下一次可验证的进步<span>Turn Review into the Next Verifiable Action</span></h2></header>
        <ol>{notes.reviewWorkflow.map((item, index) => <li key={item.stepEn}><span>{String(index + 1).padStart(2, "0")}</span><h3>{item.stepZh}<small>{item.stepEn}</small></h3><p>{item.actionZh}</p></li>)}</ol>
        <Link className="button button--primary" to={practiceHref}>{practiceActionLabel}</Link>
      </section>

      <section className="review-notes-sources page-shell" aria-labelledby="review-notes-sources-title">
        <div><p>VERSION & SOURCES</p><h2 id="review-notes-sources-title">版本边界与依据<span>Version Boundary and Source Anchors</span></h2><p>{notes.rightsNotice}</p></div>
        <ul>{notes.officialAnchors.map((source) => <li key={source.id}><strong>{source.title}<ExternalLink aria-hidden="true" /></strong><p>{source.usedForZh}</p><small>SHA-256 · {source.sha256.slice(0, 12)}…</small></li>)}</ul>
      </section>
    </main>
  );
}
