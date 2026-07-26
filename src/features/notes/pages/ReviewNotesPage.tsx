import { BookOpenCheck, Check, Download, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { ExamId } from "../../catalog/exams.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { MathContent } from "../../practice/components/MathContent.js";
import { EnglishFirstParagraph, EnglishFirstText } from "../components/EnglishFirstText.js";
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
  readonly moduleCountLabelEn: string;
  readonly moduleEyebrow: string;
  readonly moduleSectionLabel: string;
  readonly moduleSectionLabelEn: string;
  readonly practiceActionLabel: string;
  readonly practiceActionLabelEn: string;
  readonly coverageActionLabel: string;
  readonly coverageActionLabelEn: string;
  readonly downloadHref?: string;
}

function StatusLabel({ status, chinese }: {
  readonly status: "strong-start" | "partial";
  readonly chinese: string;
}) {
  return (
    <span className={`review-notes-status review-notes-status--${status}`}>
      <EnglishFirstText
        english={status === "strong-start" ? "STRONG START" : "PARTIAL COVERAGE"}
        chinese={chinese}
      />
    </span>
  );
}

export function ReviewNotesPage({
  notes,
  examId,
  visibleModuleIds,
  coverageHref,
  practiceHref,
  moduleCountLabel,
  moduleCountLabelEn,
  moduleEyebrow,
  moduleSectionLabel,
  moduleSectionLabelEn,
  practiceActionLabel,
  practiceActionLabelEn,
  coverageActionLabel,
  coverageActionLabelEn,
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
          <h1>
            <EnglishFirstText english={notes.titleEn} chinese={notes.titleZh} />
          </h1>
          <EnglishFirstParagraph english={notes.subtitleEn} chinese={notes.subtitleZh} />
          <div className="review-notes-hero__actions">
            <a className="button button--primary" href="#review-notes-modules">
              <EnglishFirstText english="Start reading" chinese="开始阅读" />
            </a>
            <Link className="button button--secondary" to={coverageHref}>
              <EnglishFirstText english={coverageActionLabelEn} chinese={coverageActionLabel} />
            </Link>
            {downloadHref !== undefined && (
              <a className="button button--secondary" href={downloadHref} download>
                <EnglishFirstText english="Download A4 PDF" chinese="下载 A4 PDF" />
                <Download aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
        <aside aria-label="Current notes edition and module count">
          <span>FOUNDATION EDITION</span>
          <strong>{visibleModules.length}</strong>
          <EnglishFirstParagraph english={moduleCountLabelEn} chinese={moduleCountLabel} />
          <small>{notes.examCycle}</small>
        </aside>
      </section>

      <nav className="review-notes-toc page-shell" aria-label="Review notes contents">
        <span>CONTENTS</span>
        <a href="#review-notes-exam-map">Exam map <small lang="zh-CN">考试地图</small></a>
        <a href="#review-notes-curriculum">Curriculum bridge <small lang="zh-CN">课程桥接</small></a>
        {visibleModules.map((module) => <a key={module.id} href={`#review-notes-${module.id}`}>{module.titleEn}</a>)}
        <a href="#review-notes-next-action">Review loop <small lang="zh-CN">复盘与下一步</small></a>
      </nav>

      <section className="review-notes-scope page-shell" aria-labelledby="review-notes-scope-title">
        <div>
          <p className="eyebrow">INCLUDED · 本版包含</p>
          <h2 id="review-notes-scope-title">
            <EnglishFirstText english="What this edition helps you do" chinese="这份笔记现在能帮你完成什么" />
          </h2>
          <EnglishFirstParagraph english={notes.scope.includedEn} chinese={notes.scope.includedZh} />
        </div>
        <div>
          <p className="eyebrow">GO DEEPER · 继续深入</p>
          <h2>
            <EnglishFirstText english="Continue with advanced study and timed evidence" chinese="继续进入深度学习与限时验证" />
          </h2>
          {notes.scope.remainingEn === undefined
            ? <p className="review-notes-chinese-support" lang="zh-CN">{notes.scope.remainingZh}</p>
            : <EnglishFirstParagraph english={notes.scope.remainingEn} chinese={notes.scope.remainingZh} />}
        </div>
      </section>

      <section className="review-notes-section page-shell" id="review-notes-exam-map" aria-labelledby="review-notes-map-title">
        <header>
          <p>01 · EXAM MAP</p>
          <h2 id="review-notes-map-title">
            <EnglishFirstText english="Understand the test before revising" chinese="先看清所选模块怎样运行" />
          </h2>
        </header>
        <div className="review-notes-facts">
          {notes.examFacts.map((fact) => (
            <article key={fact.labelEn}>
              <span>{fact.labelEn}</span>
              <h3 lang="en">{fact.valueEn}</h3>
              <small lang="zh-CN"><strong>{fact.labelZh}</strong>{fact.valueZh}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="review-notes-section page-shell" id="review-notes-curriculum" aria-labelledby="review-notes-curriculum-title">
        <header>
          <p>02 · CURRICULUM BRIDGE</p>
          <h2 id="review-notes-curriculum-title">
            <EnglishFirstText english="What transfers — and what still needs checking?" chinese="你学过的课程，哪些能直接迁移" />
          </h2>
          <EnglishFirstParagraph
            english="Use this as a curriculum map, then confirm it against your own courses and practice evidence."
            chinese="这是课程范围判断；请结合本人课程档案和在线练习结果安排复习。"
          />
        </header>
        <div className="review-notes-curricula">
          {notes.curriculumBridges.map((bridge) => (
            <article key={bridge.curriculum}>
              <StatusLabel status={bridge.status} chinese={bridge.statusZh} />
              <h3>{bridge.curriculum}</h3>
              <div>
                <h4><Check aria-hidden="true" />Likely covered <small lang="zh-CN">通常可以迁移</small></h4>
                <ul>{bridge.likelyCoveredZh.map((item, index) => (
                  <li key={item}>
                    {bridge.likelyCoveredEn?.[index] !== undefined && <strong lang="en">{bridge.likelyCoveredEn[index]}</strong>}
                    <small lang="zh-CN">{item}</small>
                  </li>
                ))}</ul>
              </div>
              <div>
                <h4>Check these gaps <small lang="zh-CN">需要逐项确认</small></h4>
                <ul>{bridge.confirmZh.map((item, index) => (
                  <li key={item}>
                    {bridge.confirmEn?.[index] !== undefined && <strong lang="en">{bridge.confirmEn[index]}</strong>}
                    <small lang="zh-CN">{item}</small>
                  </li>
                ))}</ul>
              </div>
              <div className="review-notes-curriculum-action">
                <strong>FIRST ACTION <small lang="zh-CN">第一步</small></strong>
                {bridge.firstActionEn !== undefined && <p lang="en">{bridge.firstActionEn}</p>}
                <small lang="zh-CN">{bridge.firstActionZh}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="review-notes-modules page-shell"
        id="review-notes-modules"
        aria-label={`${moduleSectionLabelEn} · ${moduleSectionLabel}`}
      >
        {visibleModules.map((module) => (
          <article className="review-notes-module" id={`review-notes-${module.id}`} key={module.id}>
            <header>
              <span>{module.number}</span>
              <div>
                <p>{moduleEyebrow}</p>
                <h2><EnglishFirstText english={module.titleEn} chinese={module.titleZh} /></h2>
                {module.summaryEn === undefined
                  ? <p className="review-notes-chinese-support" lang="zh-CN">{module.summaryZh}</p>
                  : <EnglishFirstParagraph english={module.summaryEn} chinese={module.summaryZh} />}
              </div>
              <aside>
                <strong>LEARNING OUTCOMES <small lang="zh-CN">学完你应当能够</small></strong>
                <ul>{module.learningOutcomes.map((item, index) => (
                  <li key={item}>
                    {module.learningOutcomesEn?.[index] !== undefined && <strong lang="en">{module.learningOutcomesEn[index]}</strong>}
                    <small lang="zh-CN">{item}</small>
                  </li>
                ))}</ul>
              </aside>
            </header>

            <section className="review-notes-units" aria-label={`${module.titleEn} knowledge map`}>
              <header><p>KNOWLEDGE MAP</p><h3><EnglishFirstText english="Check each knowledge unit" chinese="逐项核对知识单元" /></h3></header>
              <ol>{module.knowledgeUnits.map((unit) => (
                <li key={unit.id}><span>{unit.code}</span><strong lang="en">{unit.labelEn}</strong><small lang="zh-CN">{unit.labelZh}</small></li>
              ))}</ol>
            </section>

            <section className="review-notes-methods" aria-label={`${module.titleEn} question methods`}>
              <header><p>QUESTION METHODS</p><h3><EnglishFirstText english="What to notice, how to start, what to check" chinese="看到什么，怎样开始，如何检查" /></h3></header>
              <div>{module.methods.map((method, index) => (
                <article key={method.nameEn}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h4><EnglishFirstText english={method.nameEn} chinese={method.nameZh} /></h4>
                  <dl>
                    <div><dt>WHEN TO USE <small lang="zh-CN">识别信号</small></dt><dd>{method.signalEn !== undefined && <strong lang="en">{method.signalEn}</strong>}<small lang="zh-CN">{method.signalZh}</small></dd></div>
                    <div><dt>METHOD <small lang="zh-CN">标准动作</small></dt><dd>{method.methodEn !== undefined && <strong lang="en">{method.methodEn}</strong>}<small lang="zh-CN">{method.methodZh}</small></dd></div>
                    <div><dt>FINAL CHECK <small lang="zh-CN">最后检查</small></dt><dd>{method.checkEn !== undefined && <strong lang="en">{method.checkEn}</strong>}<small lang="zh-CN">{method.checkZh}</small></dd></div>
                  </dl>
                </article>
              ))}</div>
            </section>

            {module.originalWorkedExamples.map((example) => (
              <section className="review-notes-example" key={example.id}>
                <header>
                  <span>ORIGINAL WORKED EXAMPLE</span>
                  <h3><EnglishFirstText english={example.titleEn} chinese={example.titleZh} /></h3>
                </header>
                <div className="review-notes-example__problem">
                  <strong>PROBLEM <small lang="zh-CN">题目</small></strong>
                  <p lang="en">{example.problemEn}</p>
                  <small lang="zh-CN">{example.problemZh}</small>
                </div>
                <ol>{example.steps.map((step, index) => (
                  <li key={step.labelZh}>
                    <strong>STEP {String(index + 1).padStart(2, "0")}{step.labelEn !== undefined && <span lang="en">{step.labelEn}</span>}<small lang="zh-CN">{step.labelZh}</small></strong>
                    {step.bodyEn !== undefined && <p lang="en">{step.bodyEn}</p>}
                    <small lang="zh-CN">{step.bodyZh}</small>
                    {step.math !== undefined && <Formula value={step.math} />}
                  </li>
                ))}</ol>
                <div className="review-notes-example__conclusion">
                  <p><strong>CONCLUSION <small lang="zh-CN">结论</small></strong>{example.answerEn !== undefined && <span lang="en">{example.answerEn}</span>}<small lang="zh-CN">{example.answerZh}</small></p>
                  <p><strong>COMMON TRAP <small lang="zh-CN">常见误区</small></strong>{example.trapEn !== undefined && <span lang="en">{example.trapEn}</span>}<small lang="zh-CN">{example.trapZh}</small></p>
                </div>
              </section>
            ))}

            <section className="review-notes-recall" aria-label={`${module.titleEn} active recall`}>
              <header><BookOpenCheck aria-hidden="true" /><div><p>ACTIVE RECALL</p><h3><EnglishFirstText english="Close the notes, then answer" chinese="合上笔记再回答" /></h3></div></header>
              {module.activeRecall.map((item) => (
                <details key={item.promptEn}>
                  <summary><strong lang="en">{item.promptEn}</strong><small lang="zh-CN">{item.promptZh}</small></summary>
                  <p lang="en">{item.answerEn}</p><small lang="zh-CN">{item.answerZh}</small>
                </details>
              ))}
            </section>
          </article>
        ))}
      </section>

      <section className="review-notes-next page-shell" id="review-notes-next-action" aria-labelledby="review-notes-next-title">
        <header><p>03 · REVIEW LOOP</p><h2 id="review-notes-next-title"><EnglishFirstText english="Turn review into the next verifiable action" chinese="把复习变成下一次可验证的进步" /></h2></header>
        <ol>{notes.reviewWorkflow.map((item, index) => (
          <li key={item.stepEn}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3><EnglishFirstText english={item.stepEn} chinese={item.stepZh} /></h3>
            {item.actionEn !== undefined && <p lang="en">{item.actionEn}</p>}
            <small lang="zh-CN">{item.actionZh}</small>
          </li>
        ))}</ol>
        <Link className="button button--primary" to={practiceHref}>
          <EnglishFirstText english={practiceActionLabelEn} chinese={practiceActionLabel} />
        </Link>
      </section>

      <section className="review-notes-sources page-shell" aria-labelledby="review-notes-sources-title">
        <div>
          <p>VERSION & SOURCES</p>
          <h2 id="review-notes-sources-title"><EnglishFirstText english="Version boundary and source anchors" chinese="版本边界与依据" /></h2>
          {notes.rightsNoticeEn !== undefined && <p lang="en">{notes.rightsNoticeEn}</p>}
          <small lang="zh-CN">{notes.rightsNotice}</small>
        </div>
        <ul>{notes.officialAnchors.map((source) => (
          <li key={source.id}>
            <strong>{source.title}<ExternalLink aria-hidden="true" /></strong>
            {source.usedForEn !== undefined && <p lang="en">{source.usedForEn}</p>}
            <small lang="zh-CN">{source.usedForZh}</small>
            <small>SHA-256 · {source.sha256.slice(0, 12)}…</small>
          </li>
        ))}</ul>
      </section>
    </main>
  );
}
