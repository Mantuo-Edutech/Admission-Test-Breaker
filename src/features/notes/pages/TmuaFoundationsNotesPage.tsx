import { BookOpenText, Check, Download, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { TmuaPageHeader } from "../../catalog/components/TmuaPageHeader.js";
import { ProfileRequiredState } from "../../preparation-profile/components/ProfileRequiredState.js";
import { usePreparationProfileContext } from "../../preparation-profile/hooks/usePreparationProfileContext.js";
import { MathContent } from "../../practice/components/MathContent.js";
import type { NotesFormula } from "../content/tmua-foundations.js";
import { TMUA_FOUNDATIONS_NOTES as notes } from "../content/tmua-foundations.js";

interface TmuaFoundationsNotesPageProps {
  readonly services: AppServices;
}

function Formula({ value }: { readonly value: NotesFormula }) {
  return <MathContent blocks={[{ kind: "display-math", tex: value.tex }]} />;
}

export function TmuaFoundationsNotesPage({ services }: TmuaFoundationsNotesPageProps) {
  const { loading, profile, issue } = usePreparationProfileContext(services);
  if (loading) {
    return <main className="practice-state-page"><h1>正在打开 TMUA Notes…</h1></main>;
  }
  if (profile === null) return <ProfileRequiredState issue={issue} />;

  return (
    <main className="tmua-stage-page tmua-notes-page">
      <TmuaPageHeader />

      <section className="tmua-notes-hero page-shell">
        <div className="tmua-notes-hero__copy">
          <p className="eyebrow">{notes.authorship} · {notes.edition}</p>
          <h1><span>{notes.titleZh}</span><small>{notes.titleEn}</small></h1>
          <p>{notes.subtitleZh}</p>
          <span>{notes.subtitleEn}</span>
          <div className="tmua-notes-hero__actions">
            <a className="button button--primary" href="/notes/tmua/tmua-foundations-v2.pdf" download>
              <Download aria-hidden="true" />下载双语 PDF
            </a>
            <a className="button button--secondary" href="#notes-chapter-01">开始阅读</a>
          </div>
        </div>
        <aside className="tmua-notes-hero__edition" aria-label="本版范围">
          <span>TEACHING PREVIEW</span>
          <strong>{notes.chapters.length}</strong>
          <p>个结构化学习章节</p>
          <ul>{notes.chapters.map((chapter) => <li key={chapter.id}>{chapter.titleZh}</li>)}</ul>
        </aside>
      </section>

      <nav className="tmua-notes-toc page-shell" aria-label="笔记目录">
        <span>CONTENTS</span>
        {notes.chapters.map((chapter) => (
          <a key={chapter.id} href={`#notes-chapter-${chapter.number}`}>{chapter.number} {chapter.titleZh}</a>
        ))}
        <a href="#notes-checkpoint">{String(notes.chapters.length + 1).padStart(2, "0")} 主动回忆检查</a>
      </nav>

      <section className="tmua-notes-section page-shell" aria-labelledby="exam-map-title">
        <header className="tmua-notes-section__heading">
          <p>OFFICIAL EXAM MAP</p>
          <h2 id="exam-map-title"><span>先看清考试</span><small>Understand the Test Before Training</small></h2>
          <p>下面六项是官方事实；之后的三轮方法是满托训练建议，两者不会混写。</p>
        </header>
        <div className="tmua-notes-fact-grid">
          {notes.examMap.officialFacts.map((fact) => (
            <article key={fact.labelEn}>
              <span>{fact.labelEn}</span>
              <h3>{fact.labelZh}</h3>
              <p>{fact.valueZh}</p>
              <small>{fact.valueEn}</small>
            </article>
          ))}
        </div>
        <div className="tmua-notes-strategy">
          <div>
            <Sparkles aria-hidden="true" />
            <span>满托训练建议 · MANTUO METHOD</span>
          </div>
          <ol>
            {notes.examMap.mantouStrategy.map((item) => (
              <li key={item.nameEn}>
                <h3>{item.nameZh}<small>{item.nameEn}</small></h3>
                <p>{item.guidanceZh}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="tmua-notes-section tmua-notes-curricula page-shell" aria-labelledby="curriculum-title">
        <header className="tmua-notes-section__heading">
          <p>CURRICULUM BRIDGE</p>
          <h2 id="curriculum-title"><span>你学过的课程，具体还缺什么？</span><small>What Is Covered — and What Still Needs Checking?</small></h2>
          <p>这是课程层面的初步映射，不等于个人能力结论；具体结果仍以你填写的考试局、科目与已完成单元为准。</p>
        </header>
        <div className="tmua-notes-curricula__grid">
          {notes.curriculumBridges.map((bridge) => (
            <article key={bridge.curriculum}>
              <header>
                <span className={`tmua-notes-status tmua-notes-status--${bridge.status}`}>{bridge.statusZh}</span>
                <h3>{bridge.curriculum}</h3>
              </header>
              <div>
                <h4><Check aria-hidden="true" />通常已覆盖 / Likely covered</h4>
                <ul>{bridge.likelyCoveredZh.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <h4>需要逐项确认 / Check these gaps</h4>
                <ul>{bridge.confirmZh.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <p><strong>第一步：</strong>{bridge.firstActionZh}</p>
            </article>
          ))}
        </div>
        <Link className="tmua-notes-inline-link" to="/exams/tmua/coverage">查看我的课程覆盖结果 →</Link>
      </section>

      {notes.chapters.map((chapter) => (
        <article className="tmua-notes-chapter page-shell" id={`notes-chapter-${chapter.number}`} key={chapter.id}>
          <header className="tmua-notes-chapter__header">
            <span>{chapter.number}</span>
            <div>
              <p>TMUA FOUNDATIONS</p>
              <h2>{chapter.titleZh}<small>{chapter.titleEn}</small></h2>
              <p>{chapter.summaryZh}</p>
            </div>
            <aside>
              <strong>学完你应当能够</strong>
              <ul>{chapter.learningOutcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul>
            </aside>
          </header>

          {chapter.sections.map((section, sectionIndex) => (
            <section className="tmua-notes-topic" key={section.titleEn}>
              <header>
                <span>{chapter.number}.{sectionIndex + 1}</span>
                <h3>{section.titleZh}<small>{section.titleEn}</small></h3>
              </header>
              <div className="tmua-notes-topic__body">
                <div className="tmua-notes-prose">
                  {section.paragraphsZh.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
                <div className="tmua-notes-rules">
                  {section.rules.map((rule) => (
                    <article key={rule.term}>
                      <h4>{rule.term}</h4>
                      <p>{rule.statementZh}</p>
                      {rule.formula !== undefined && <Formula value={rule.formula} />}
                    </article>
                  ))}
                </div>

                {section.workedExamples?.map((example) => (
                  <article className="tmua-notes-example" key={example.id}>
                    <header>
                      <span>WORKED EXAMPLE</span>
                      <h4>{example.titleZh}<small>{example.titleEn}</small></h4>
                    </header>
                    <div className="tmua-notes-example__problem">
                      <strong>题目 / Problem</strong>
                      <p>{example.problemZh}</p>
                      <small>{example.problemEn}</small>
                    </div>
                    <ol>
                      {example.steps.map((step) => (
                        <li key={step.labelZh}>
                          <strong>{step.labelZh}</strong>
                          <p>{step.bodyZh}</p>
                          {step.math !== undefined && <Formula value={step.math} />}
                        </li>
                      ))}
                    </ol>
                    <div className="tmua-notes-example__answer"><strong>结论</strong><p>{example.answerZh}</p></div>
                    <div className="tmua-notes-example__trap"><strong>常见误区</strong><p>{example.trapZh}</p></div>
                  </article>
                ))}

                {section.activeRecall.map((recall) => (
                  <details className="tmua-notes-recall" key={recall.promptEn}>
                    <summary>
                      <BookOpenText aria-hidden="true" />
                      <span><strong>合上笔记回答</strong>{recall.promptZh}<small>{recall.promptEn}</small></span>
                    </summary>
                    <div><p>{recall.answerZh}</p><small>{recall.answerEn}</small></div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </article>
      ))}

      <section className="tmua-notes-checkpoint page-shell" id="notes-checkpoint" aria-labelledby="checkpoint-title">
        <header>
          <p>ACTIVE RECALL</p>
          <h2 id="checkpoint-title">{notes.checkpoint.titleZh}<small>{notes.checkpoint.titleEn}</small></h2>
          <span>{notes.checkpoint.instructionsZh}</span>
        </header>
        <ol>
          {notes.checkpoint.questions.map((question, index) => (
            <li key={question.id}>
              <div className="tmua-notes-checkpoint__question">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{question.promptZh}</h3><small>{question.promptEn}</small></div>
              </div>
              <ol type="A">{question.options.map((option) => <li key={option}>{option}</li>)}</ol>
              <details>
                <summary>查看答案与解释</summary>
                <p><strong>{String.fromCharCode(65 + question.correctOption)}.</strong> {question.explanationZh}</p>
                <small>{question.explanationEn}</small>
              </details>
            </li>
          ))}
        </ol>
      </section>

      <section className="tmua-notes-review page-shell" aria-labelledby="review-title">
        <header>
          <p>REVIEW LOOP</p>
          <h2 id="review-title">把每道题变成下一次会做<small>Turn Every Attempt into Evidence</small></h2>
        </header>
        <ol>
          {notes.reviewWorkflow.map((item, index) => (
            <li key={item.stepEn}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.stepZh}<small>{item.stepEn}</small></h3>
              <p>{item.actionZh}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="tmua-notes-sources page-shell" aria-labelledby="notes-sources-title">
        <div>
          <p>VERSION & SOURCES</p>
          <h2 id="notes-sources-title">版本边界与官方依据<small>Version Boundary and Official Anchors</small></h2>
          <p>{notes.rightsNotice}</p>
          <p>{notes.scope.remainingZh}</p>
        </div>
        <ul>
          {notes.officialAnchors.map((source) => (
            <li key={source.id}>
              <strong>{source.title}<Check aria-hidden="true" /></strong>
              <small>{source.usedForZh}</small>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
