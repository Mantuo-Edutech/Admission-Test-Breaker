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
        <p className="eyebrow">正在生成知识对照</p>
        <h1>正在读取课程档案…</h1>
      </main>
    );
  }
  if (profile === null) return <ProfileRequiredState issue={issue} />;

  const report = buildCourseCoverageReport(profile);

  return (
    <main className="tmua-stage-page tmua-coverage-page">
      <TmuaPageHeader />
      <section className="tmua-stage-hero page-shell">
        <p className="eyebrow">第 2 步 · Knowledge Mapping</p>
        <h1>
          课程覆盖与补学建议
          <span>Course Coverage & Learning Plan</span>
        </h1>
        <p>根据你选择的课程模块，明确哪些内容只需复习、哪些需要先检查或补学。</p>
      </section>

      <section className="course-coverage-verdict page-shell" aria-labelledby="course-verdict-title">
        <div className="course-coverage-verdict__primary">
          <div className="course-coverage-verdict__score" aria-label={`${report.directCount} of 10 topics covered`}>
            <strong>{report.directCount}<span>/10</span></strong>
            <small>课程范围已覆盖<br />Covered by your course</small>
          </div>
          <div>
            <p className="eyebrow">老师建议 · Teacher Recommendation</p>
            <h2 id="course-verdict-title">
              {report.directCount} 项知识已经覆盖：先复习，现阶段不需要额外知识课程
              <span>{report.directCount} areas are covered: review first; no additional content lessons for now.</span>
            </h2>
            <p>
              “已覆盖”表示你选择的课程明确包含这些知识，不等于已经熟练。建议先做主题复习和检查题；只有出现持续的概念性错误时，再安排针对性讲解。
            </p>
          </div>
        </div>
        <div className="course-coverage-verdict__next">
          <article>
            <SearchCheck aria-hidden="true" />
            <strong>{report.relatedCount}</strong>
            <div><h3>项部分覆盖</h3><span>Partly covered · 先查缺口，再决定是否补课</span></div>
          </article>
          <article>
            <Clock3 aria-hidden="true" />
            <strong>{report.notEvidencedCount}</strong>
            <div>
              <h3>项课程档案未显示覆盖</h3>
              <span>
                Not evidenced · 若全部未学，基础学习约 {report.notEvidencedFoundationHours.min}–{report.notEvidencedFoundationHours.max} 小时
              </span>
            </div>
          </article>
        </div>
      </section>

      <section className="course-coverage-report page-shell" aria-labelledby="course-coverage-title">
        <header className="section-heading">
          <p>10 个知识领域 · TMUA KNOWLEDGE MAP</p>
          <h2 id="course-coverage-title">逐项学习建议 <span>Topic-by-topic Plan</span></h2>
          <span>先看课程结论，再看具体主题和预计时间；时间是备课区间，不是能力 Benchmark。</span>
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
                  <h3>{domain.label}<span>{domain.labelEn}</span></h3>

                  <div className="course-coverage-item__topics">
                    <h4>{domain.status === "direct" ? "复习重点" : "需要检查或学习的内容"}<span>{domain.status === "direct" ? "Review Focus" : "What to Check or Learn"}</span></h4>
                    <ul aria-label={`${domain.label}具体主题`}>
                      {domain.studyTopics.map((topic) => (
                        <li key={topic.en}><strong>{topic.zh}</strong><span>{topic.en}</span></li>
                      ))}
                    </ul>
                  </div>

                  {domain.evidence.length > 0 ? (
                    <div className="course-coverage-item__evidence">
                      <p>覆盖依据 <span>Course evidence</span></p>
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
                    <strong>{statusLabel.zh}</strong>
                    <span>{statusLabel.en}</span>
                  </p>
                  {domain.status === "direct" && (
                    <>
                      <h4>知识点已覆盖：只需要复习；现阶段不需要额外课程</h4>
                      <p>建议先用 {domain.reviewMinutes.min}–{domain.reviewMinutes.max} 分钟复习左侧主题，再做 8–10 道对应题检查掌握。</p>
                    </>
                  )}
                  {domain.status === "related" && (
                    <>
                      <h4>先查缺口，再决定是否补学</h4>
                      <p>先用 {domain.gapCheckMinutes.min}–{domain.gapCheckMinutes.max} 分钟做主题自检；如果是概念缺失，从基础学习约需 {domain.foundationHours.min}–{domain.foundationHours.max} 小时。</p>
                    </>
                  )}
                  {domain.status === "not-evidenced" && (
                    <>
                      <h4>若尚未学过，建议先完成基础学习</h4>
                      <p>先核对左侧清单；熟悉即可直接练题，不熟悉则预计需要 {domain.foundationHours.min}–{domain.foundationHours.max} 小时。</p>
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
          <h2>课程覆盖不等于掌握程度 <span>Coverage is not mastery</span></h2>
          <p>
            这里回答“是否需要额外知识课”；真实掌握、推理能力和答题节奏仍要通过实际作答确认。后续诊断可以把“课程上过但忘了”和“从未学过”区分开。
          </p>
        </div>
      </section>

      <div className="tmua-stage-actions page-shell">
        <Link className="button button--secondary" to="/exams/tmua/profile">修改课程档案</Link>
      </div>

      <p className="course-coverage-source page-shell">
        <BookOpenCheck aria-hidden="true" />
        生成方式：固定课程映射，不调用 AI。依据 CAIE / Pearson 课程规格与 TMUA 2026–2027 Content Specification，不推断未选择的模块。
      </p>
    </main>
  );
}
