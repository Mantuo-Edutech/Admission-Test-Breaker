import { ArrowRight, BookOpenCheck, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { usePreparationProfileContext } from "../../preparation-profile/hooks/usePreparationProfileContext.js";
import { CURRENT_PUBLISHED_PRACTICE_REVISIONS } from "../../practice/content/published-revisions.js";
import { TmuaPageHeader } from "../components/TmuaPageHeader.js";
import { TMUA_PUBLIC_SUMMARY } from "../tmua-summary.js";

interface TmuaHubPageProps {
  services: AppServices;
}

const STARTING_STEPS = [
  {
    number: "01",
    title: "Add your course profile",
    titleZh: "填写课程信息",
    detail: "Select your curriculum, mathematics courses and current modules.",
  },
  {
    number: "02",
    title: "Map your course coverage",
    titleZh: "查看知识覆盖",
    detail: "See what is covered, what needs review and what needs new learning.",
  },
  {
    number: "03",
    title: "Practise complete papers",
    titleZh: "完成整套真题",
    detail: "Work through 18 complete papers with answers, changes and time saved.",
  },
  {
    number: "04",
    title: "Review and train again",
    titleZh: "根据结果继续训练",
    detail: "Review errors and timing, then choose the next full paper or review note.",
  },
] as const;

const publishedTmuaPastPaperQuestions = CURRENT_PUBLISHED_PRACTICE_REVISIONS
  .filter((paper) => paper.exam === "TMUA" && paper.paperId !== "tmua-diagnostic-v1")
  .reduce((total, paper) => total + paper.questionCount, 0);

export function TmuaHubPage({ services }: TmuaHubPageProps) {
  const { loading, profile, issue } = usePreparationProfileContext(services);
  const hasProfile = !loading && profile !== null;

  return (
    <main className="tmua-hub-page tmua-overview-page">
      <TmuaPageHeader />

      <section className="tmua-hub-hero page-shell">
        <div>
          <p className="eyebrow">TMUA PREPARATION</p>
          <h1><span>Know your starting point.</span><span>Practise with purpose.</span><small lang="zh-CN">先了解起点，再开始练习</small></h1>
          <p>Map your current courses to TMUA knowledge, then move straight into complete online papers.</p>
          <div className="tmua-overview-page__actions">
            <Link
              className="button button--primary"
              to={hasProfile ? "/exams/tmua/coverage" : "/exams/tmua/profile"}
            >
              {hasProfile ? "View course coverage" : "Add course profile"}
              <ArrowRight aria-hidden="true" />
            </Link>
            {hasProfile && (
              <Link className="button button--secondary" to="/exams/tmua/profile">
                Edit course profile
              </Link>
            )}
            <Link className="button button--secondary" to="/exams/tmua/past-papers">
              Practice papers
            </Link>
          </div>
        </div>
        <dl aria-label="TMUA paper library" role="group">
          <div><dt>COMPLETE PAPERS</dt><dd>{TMUA_PUBLIC_SUMMARY.paperCount}</dd></div>
          <div className="tmua-hub-hero__available"><dt>QUESTIONS</dt><dd>{publishedTmuaPastPaperQuestions}</dd></div>
          <div>
            <dt>ONLINE</dt>
            <dd>All {TMUA_PUBLIC_SUMMARY.paperCount} papers</dd>
          </div>
        </dl>
      </section>

      {issue !== null && (
        <div className="page-shell calm-notice" role="status">
          Your previous local course profile could not be restored safely. Please add it again.
        </div>
      )}

      <section className="tmua-starting-path page-shell" aria-labelledby="tmua-starting-path-title">
        <header className="section-heading">
          <p>YOUR PREPARATION PATH</p>
          <h2 id="tmua-starting-path-title">Prepare for TMUA in four steps</h2>
          <span>Map, fill gaps, practise and review.<small lang="zh-CN">定位、补学、练习、复盘</small></span>
        </header>
        <ol aria-label="Four-step TMUA preparation path">
          {STARTING_STEPS.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <small lang="zh-CN">{step.titleZh}</small>
              <p>{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="tmua-public-boundary page-shell" aria-labelledby="tmua-public-boundary-title">
        <BookOpenCheck aria-hidden="true" />
        <div>
          <h2 id="tmua-public-boundary-title">No contact details required<small lang="zh-CN">无需提交联系方式</small></h2>
          <p>Your course map only uses curriculum and preparation information. No name, phone number or WeChat is required.</p>
        </div>
        <ShieldCheck aria-hidden="true" />
      </section>
    </main>
  );
}
