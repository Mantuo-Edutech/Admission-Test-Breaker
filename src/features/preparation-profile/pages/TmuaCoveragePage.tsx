import {
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  Clock3,
  SearchCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { TmuaPageHeader } from "../../catalog/components/TmuaPageHeader.js";
import { ProfileRequiredState } from "../components/ProfileRequiredState.js";
import {
  buildCourseCoverageReport,
  type CourseCoverageStatus,
} from "../coverage.js";
import { usePreparationProfileContext } from "../hooks/usePreparationProfileContext.js";

interface TmuaCoveragePageProps {
  services: AppServices;
}

const STATUS_LABELS: Readonly<
  Record<CourseCoverageStatus, { zh: string; en: string }>
> = {
  direct: { zh: "课程范围已覆盖", en: "Covered by your course" },
  related: { zh: "课程部分覆盖", en: "Partly covered" },
  "not-evidenced": {
    zh: "课程档案未显示覆盖",
    en: "Not found in selected modules",
  },
};

function scopeLabel(scope: "paper-1-and-2" | "paper-2" | "support") {
  if (scope === "paper-2") return "Paper 2 · Logic & Proof";
  if (scope === "support") return "支撑知识 · Supporting Knowledge";
  return "Paper 1 & 2";
}

export function TmuaCoveragePage({ services }: TmuaCoveragePageProps) {
  const { loading, profile, issue } = usePreparationProfileContext(services);

  if (loading) {
    return (
      <main className="practice-state-page" aria-live="polite">
        <p className="eyebrow">BUILDING COURSE MAP</p>
        <h1>Reading your course profile…</h1>
      </main>
    );
  }
  if (profile === null) return <ProfileRequiredState issue={issue} />;

  const report = buildCourseCoverageReport(profile);

  return (
    <main className="tmua-stage-page tmua-coverage-page">
      <TmuaPageHeader />
      <section className="tmua-stage-hero page-shell">
        <p className="eyebrow">KNOWLEDGE MAPPING</p>
        <h1>
          Course Coverage & Learning Plan
          <span lang="zh-CN">课程覆盖与补学建议</span>
        </h1>
        <p>See which topics need review, verification or new learning based on your selected course modules.</p>
      </section>

      <section className="course-coverage-verdict page-shell" aria-labelledby="course-verdict-title">
        <div className="course-coverage-verdict__primary">
          <div className="course-coverage-verdict__score" aria-label={`${report.directCount} of 10 topics covered`}>
            <strong>{report.directCount}<span>/10</span></strong>
            <small>Covered by your course<br /><span lang="zh-CN">课程范围已覆盖</span></small>
          </div>
          <div>
            <p className="eyebrow">TEACHER RECOMMENDATION</p>
            <h2 id="course-verdict-title">
              {report.directCount} areas are covered: review first; no additional content lessons for now.
              <span lang="zh-CN">{report.directCount} 项知识已经覆盖：先复习，现阶段不需要额外知识课程</span>
            </h2>
            <p>Covered means your selected course explicitly includes the topic; it does not prove mastery. Review first, then confirm it through full-paper evidence.</p>
          </div>
        </div>
        <div className="course-coverage-verdict__next">
          <article>
            <SearchCheck aria-hidden="true" />
            <strong>{report.relatedCount}</strong>
            <div><h3>Partly covered</h3><span>Check the exact gap before adding extra study.<small lang="zh-CN">先查缺口，再决定是否补课</small></span></div>
          </article>
          <article>
            <Clock3 aria-hidden="true" />
            <strong>{report.notEvidencedCount}</strong>
            <div>
              <h3>Not evidenced by your courses</h3>
              <span>
                Not evidenced · 若全部未学，基础学习约 {report.notEvidencedFoundationHours.min}–{report.notEvidencedFoundationHours.max} 小时
              </span>
            </div>
          </article>
        </div>
      </section>

      <section className="course-coverage-report page-shell" aria-labelledby="course-coverage-title">
        <header className="section-heading">
          <p>TMUA KNOWLEDGE MAP</p>
          <h2 id="course-coverage-title">Topic-by-topic plan <span lang="zh-CN">逐项学习建议</span></h2>
          <span>Course coverage is not the same as personal mastery.<small lang="zh-CN">课程覆盖不是实际掌握程度</small></span>
        </header>
        <ol className="course-coverage-list">
          {report.domains.map((domain, index) => {
            const statusLabel = STATUS_LABELS[domain.status];
            return (
              <li key={domain.id} className={`course-coverage-item course-coverage-item--${domain.status}`}>
                <span className="course-coverage-item__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="course-coverage-item__content">
                  <p>{scopeLabel(domain.scope)}</p>
                  <h3>{domain.labelEn}<span lang="zh-CN">{domain.label}</span></h3>

                  <div className="course-coverage-item__topics">
                    <h4>{domain.status === "direct" ? "Review Focus" : "What to Check or Learn"}<span lang="zh-CN">{domain.status === "direct" ? "复习重点" : "需要检查或学习的内容"}</span></h4>
                    <ul aria-label={`${domain.label}具体主题`}>
                      {domain.studyTopics.map((topic) => (
                        <li key={topic.en}><strong>{topic.en}</strong><span lang="zh-CN">{topic.zh}</span></li>
                      ))}
                    </ul>
                  </div>

                  {domain.evidence.length > 0 ? (
                    <div className="course-coverage-item__evidence">
                      <p>Course evidence <span lang="zh-CN">覆盖依据</span></p>
                      <ul aria-label={`${domain.label}课程证据`}>
                        {domain.evidence.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  ) : (
                    <p className="course-coverage-item__empty">
                      你选择的课程模块中没有找到明确映射；这不等于你一定没学过。
                    </p>
                  )}
                </div>

                <aside className="course-coverage-item__decision">
                  <p className="course-coverage-item__status">
                    {domain.status === "direct" && <CheckCircle2 aria-hidden="true" />}
                    {domain.status === "related" && <SearchCheck aria-hidden="true" />}
                    {domain.status === "not-evidenced" && <CircleAlert aria-hidden="true" />}
                    <strong>{statusLabel.en}</strong>
                    <span lang="zh-CN">{statusLabel.zh}</span>
                  </p>
                  {domain.status === "direct" && (
                    <>
                      <h4>Covered: review only; no additional course is needed now.</h4>
                      <p>Review these topics for {domain.reviewMinutes.min}–{domain.reviewMinutes.max} minutes, then verify them through practice.</p>
                    </>
                  )}
                  {domain.status === "related" && (
                    <>
                      <h4>Check the gap before adding new content study.</h4>
                      <p>Use {domain.gapCheckMinutes.min}–{domain.gapCheckMinutes.max} minutes for a topic check. A conceptual gap may need {domain.foundationHours.min}–{domain.foundationHours.max} hours of foundation work.</p>
                    </>
                  )}
                  {domain.status === "not-evidenced" && (
                    <>
                      <h4>Complete the foundation first if this is new.</h4>
                      <p>Check the topic list. If it is unfamiliar, allow about {domain.foundationHours.min}–{domain.foundationHours.max} hours for foundation study.</p>
                    </>
                  )}
                </aside>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="course-coverage-boundary page-shell">
        <CircleAlert aria-hidden="true" />
        <div>
          <h2>Coverage is not mastery <span lang="zh-CN">课程覆盖不等于掌握程度</span></h2>
          <p>This map answers whether additional content learning may be needed. Full-paper performance is still required to assess accuracy, reasoning and pacing.</p>
        </div>
      </section>

      <div className="tmua-stage-actions page-shell">
        <Link className="button button--secondary" to="/exams/tmua/profile">Edit course profile</Link>
      </div>

      <p className="course-coverage-source page-shell">
        <BookOpenCheck aria-hidden="true" />
        Generated from fixed curriculum mappings; no live AI call. Based on curriculum specifications and the TMUA 2026–2027 Content Specification.
      </p>
    </main>
  );
}
