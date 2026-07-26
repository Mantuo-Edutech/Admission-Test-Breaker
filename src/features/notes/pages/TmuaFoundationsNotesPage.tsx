import { BookOpenText, Check, Download, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { TmuaPageHeader } from "../../catalog/components/TmuaPageHeader.js";
import { ProfileRequiredState } from "../../preparation-profile/components/ProfileRequiredState.js";
import { usePreparationProfileContext } from "../../preparation-profile/hooks/usePreparationProfileContext.js";
import { MathContent } from "../../practice/components/MathContent.js";
import { EnglishFirstParagraph, EnglishFirstText } from "../components/EnglishFirstText.js";
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
    return <main className="practice-state-page"><h1><EnglishFirstText english="Opening TMUA Notes…" chinese="正在打开 TMUA Notes…" /></h1></main>;
  }
  if (profile === null) return <ProfileRequiredState issue={issue} />;

  return (
    <main className="tmua-stage-page tmua-notes-page">
      <TmuaPageHeader />

      <section className="tmua-notes-hero page-shell">
        <div className="tmua-notes-hero__copy">
          <p className="eyebrow">{notes.authorship} · {notes.edition}</p>
          <h1><EnglishFirstText english={notes.titleEn} chinese={notes.titleZh} /></h1>
          <EnglishFirstParagraph english={notes.subtitleEn} chinese={notes.subtitleZh} />
          <div className="tmua-notes-hero__actions">
            <a className="button button--primary" href="/notes/tmua/tmua-foundations-v2.pdf" download>
              <Download aria-hidden="true" /><EnglishFirstText english="Download bilingual PDF" chinese="下载双语 PDF" />
            </a>
            <a className="button button--secondary" href="#notes-chapter-01"><EnglishFirstText english="Start reading" chinese="开始阅读" /></a>
          </div>
        </div>
        <aside className="tmua-notes-hero__edition" aria-label="Current edition scope">
          <span>FOUNDATION EDITION</span>
          <strong>{notes.chapters.length}</strong>
          <EnglishFirstParagraph english="structured learning chapters" chinese="个结构化学习章节" />
          <ul>{notes.chapters.map((chapter) => <li key={chapter.id}><EnglishFirstText english={chapter.titleEn} chinese={chapter.titleZh} /></li>)}</ul>
        </aside>
      </section>

      <nav className="tmua-notes-toc page-shell" aria-label="Notes contents">
        <span>CONTENTS</span>
        {notes.chapters.map((chapter) => (
          <a key={chapter.id} href={`#notes-chapter-${chapter.number}`}>{chapter.number} {chapter.titleEn}<small lang="zh-CN">{chapter.titleZh}</small></a>
        ))}
        <a href="#notes-checkpoint">{String(notes.chapters.length + 1).padStart(2, "0")} Active recall check <small lang="zh-CN">主动回忆检查</small></a>
      </nav>

      <section className="tmua-notes-section page-shell" aria-labelledby="exam-map-title">
        <header className="tmua-notes-section__heading">
          <p>OFFICIAL EXAM MAP</p>
          <h2 id="exam-map-title"><EnglishFirstText english="Understand the Test Before Training" chinese="先看清考试" /></h2>
          <EnglishFirstParagraph english="The six facts below describe the test. The three-pass routine that follows is Mantou's training method." chinese="下面六项是考试事实；之后的三轮方法是满托训练建议，两者不会混写。" />
        </header>
        <div className="tmua-notes-fact-grid">
          {notes.examMap.officialFacts.map((fact) => (
            <article key={fact.labelEn}>
              <span>{fact.labelEn}</span>
              <h3 lang="en">{fact.valueEn}</h3>
              <small lang="zh-CN"><strong>{fact.labelZh}</strong>{fact.valueZh}</small>
            </article>
          ))}
        </div>
        <div className="tmua-notes-strategy">
          <div>
            <Sparkles aria-hidden="true" />
            <span>MANTUO METHOD · 满托训练建议</span>
          </div>
          <ol>
            {notes.examMap.mantouStrategy.map((item) => (
              <li key={item.nameEn}>
                <h3><EnglishFirstText english={item.nameEn} chinese={item.nameZh} /></h3>
                <EnglishFirstParagraph english={item.guidanceEn} chinese={item.guidanceZh} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="tmua-notes-section tmua-notes-curricula page-shell" aria-labelledby="curriculum-title">
        <header className="tmua-notes-section__heading">
          <p>CURRICULUM BRIDGE</p>
          <h2 id="curriculum-title"><EnglishFirstText english="What Is Covered — and What Still Needs Checking?" chinese="你学过的课程，具体还缺什么？" /></h2>
          <EnglishFirstParagraph english="This curriculum map is a starting point, not a verdict on your ability. Confirm it against your exam board, subjects and completed units." chinese="这是课程层面的初步映射，不等于个人能力结论；具体结果仍以你填写的考试局、科目与已完成单元为准。" />
        </header>
        <div className="tmua-notes-curricula__grid">
          {notes.curriculumBridges.map((bridge) => (
            <article key={bridge.curriculum}>
              <header>
                <span className={`tmua-notes-status tmua-notes-status--${bridge.status}`}><EnglishFirstText english={bridge.status === "strong-start" ? "STRONG START" : "PARTIAL COVERAGE"} chinese={bridge.statusZh} /></span>
                <h3>{bridge.curriculum}</h3>
              </header>
              <div>
                <h4><Check aria-hidden="true" />Likely covered <small lang="zh-CN">通常已覆盖</small></h4>
                <ul>{bridge.likelyCoveredEn.map((item, index) => <li key={item}><EnglishFirstParagraph english={item} chinese={bridge.likelyCoveredZh[index] ?? ""} /></li>)}</ul>
              </div>
              <div>
                <h4>Check these gaps <small lang="zh-CN">需要逐项确认</small></h4>
                <ul>{bridge.confirmEn.map((item, index) => <li key={item}><EnglishFirstParagraph english={item} chinese={bridge.confirmZh[index] ?? ""} /></li>)}</ul>
              </div>
              <div><strong>FIRST ACTION <small lang="zh-CN">第一步</small></strong><EnglishFirstParagraph english={bridge.firstActionEn} chinese={bridge.firstActionZh} /></div>
            </article>
          ))}
        </div>
        <Link className="tmua-notes-inline-link" to="/exams/tmua/coverage">View my curriculum coverage <small lang="zh-CN">查看我的课程覆盖结果</small> →</Link>
      </section>

      {notes.chapters.map((chapter) => (
        <article className="tmua-notes-chapter page-shell" id={`notes-chapter-${chapter.number}`} key={chapter.id}>
          <header className="tmua-notes-chapter__header">
            <span>{chapter.number}</span>
            <div>
              <p>TMUA FOUNDATIONS</p>
              <h2><EnglishFirstText english={chapter.titleEn} chinese={chapter.titleZh} /></h2>
              <EnglishFirstParagraph english={chapter.summaryEn} chinese={chapter.summaryZh} />
            </div>
            <aside>
              <strong>LEARNING OUTCOMES <small lang="zh-CN">学完你应当能够</small></strong>
              <ul>{chapter.learningOutcomesEn.map((outcome, index) => <li key={outcome}><EnglishFirstParagraph english={outcome} chinese={chapter.learningOutcomes[index] ?? ""} /></li>)}</ul>
            </aside>
          </header>

          {chapter.sections.map((section, sectionIndex) => (
            <section className="tmua-notes-topic" key={section.titleEn}>
              <header>
                <span>{chapter.number}.{sectionIndex + 1}</span>
                <h3><EnglishFirstText english={section.titleEn} chinese={section.titleZh} /></h3>
              </header>
              <div className="tmua-notes-topic__body">
                <div className="tmua-notes-prose">
                  {section.paragraphsEn.map((paragraph, index) => <EnglishFirstParagraph key={paragraph} english={paragraph} chinese={section.paragraphsZh[index] ?? ""} />)}
                </div>
                <div className="tmua-notes-rules">
                  {section.rules.map((rule) => (
                    <article key={rule.term}>
                      <h4>{rule.term}</h4>
                      <EnglishFirstParagraph english={rule.statementEn} chinese={rule.statementZh} />
                      {rule.formula !== undefined && <Formula value={rule.formula} />}
                    </article>
                  ))}
                </div>

                {section.workedExamples?.map((example) => (
                  <article className="tmua-notes-example" key={example.id}>
                    <header>
                      <span>WORKED EXAMPLE</span>
                      <h4><EnglishFirstText english={example.titleEn} chinese={example.titleZh} /></h4>
                    </header>
                    <div className="tmua-notes-example__problem">
                      <strong>PROBLEM <small lang="zh-CN">题目</small></strong>
                      <p lang="en">{example.problemEn}</p>
                      <small lang="zh-CN">{example.problemZh}</small>
                    </div>
                    <ol>
                      {example.steps.map((step) => (
                        <li key={step.labelEn}>
                          <strong><EnglishFirstText english={step.labelEn} chinese={step.labelZh} /></strong>
                          <EnglishFirstParagraph english={step.bodyEn} chinese={step.bodyZh} />
                          {step.math !== undefined && <Formula value={step.math} />}
                        </li>
                      ))}
                    </ol>
                    <div className="tmua-notes-example__answer"><strong>CONCLUSION <small lang="zh-CN">结论</small></strong><EnglishFirstParagraph english={example.answerEn} chinese={example.answerZh} /></div>
                    <div className="tmua-notes-example__trap"><strong>COMMON TRAP <small lang="zh-CN">常见误区</small></strong><EnglishFirstParagraph english={example.trapEn} chinese={example.trapZh} /></div>
                  </article>
                ))}

                {section.activeRecall.map((recall) => (
                  <details className="tmua-notes-recall" key={recall.promptEn}>
                    <summary>
                      <BookOpenText aria-hidden="true" />
                      <span><strong>CLOSE THE NOTES, THEN ANSWER <small lang="zh-CN">合上笔记回答</small></strong><span lang="en">{recall.promptEn}</span><small lang="zh-CN">{recall.promptZh}</small></span>
                    </summary>
                    <div><p lang="en">{recall.answerEn}</p><small lang="zh-CN">{recall.answerZh}</small></div>
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
          <h2 id="checkpoint-title"><EnglishFirstText english={notes.checkpoint.titleEn} chinese={notes.checkpoint.titleZh} /></h2>
          <EnglishFirstParagraph english={notes.checkpoint.instructionsEn} chinese={notes.checkpoint.instructionsZh} />
        </header>
        <ol>
          {notes.checkpoint.questions.map((question, index) => (
            <li key={question.id}>
              <div className="tmua-notes-checkpoint__question">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3 lang="en">{question.promptEn}</h3><small lang="zh-CN">{question.promptZh}</small></div>
              </div>
              <ol type="A">{question.options.map((option) => <li key={option}>{option}</li>)}</ol>
              <details>
                <summary>View answer and explanation <small lang="zh-CN">查看答案与解释</small></summary>
                <p lang="en"><strong>{String.fromCharCode(65 + question.correctOption)}.</strong> {question.explanationEn}</p>
                <small lang="zh-CN">{question.explanationZh}</small>
              </details>
            </li>
          ))}
        </ol>
      </section>

      <section className="tmua-notes-review page-shell" aria-labelledby="review-title">
        <header>
          <p>REVIEW LOOP</p>
          <h2 id="review-title"><EnglishFirstText english="Turn Every Attempt into Evidence" chinese="把每道题变成下一次会做" /></h2>
        </header>
        <ol>
          {notes.reviewWorkflow.map((item, index) => (
            <li key={item.stepEn}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3><EnglishFirstText english={item.stepEn} chinese={item.stepZh} /></h3>
              <EnglishFirstParagraph english={item.actionEn} chinese={item.actionZh} />
            </li>
          ))}
        </ol>
      </section>

      <section className="tmua-notes-sources page-shell" aria-labelledby="notes-sources-title">
        <div>
          <p>VERSION & SOURCES</p>
          <h2 id="notes-sources-title"><EnglishFirstText english="Version Boundary and Official Anchors" chinese="版本边界与官方依据" /></h2>
          <EnglishFirstParagraph english={notes.rightsNoticeEn} chinese={notes.rightsNotice} />
          <EnglishFirstParagraph english={notes.scope.remainingEn} chinese={notes.scope.remainingZh} />
        </div>
        <ul>
          {notes.officialAnchors.map((source) => (
            <li key={source.id}>
              <strong>{source.title}<Check aria-hidden="true" /></strong>
              <EnglishFirstParagraph english={source.usedForEn} chinese={source.usedForZh} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
