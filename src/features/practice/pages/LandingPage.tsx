import { ArrowUpRight, CircleUserRound } from "lucide-react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { EXAM_CATALOG } from "../../catalog/exams.js";
import { BrandMark } from "../../navigation/components/BrandMark.js";

export function LandingPage({ services }: { services?: Pick<AppServices, "funnel"> }) {
  return (
    <main className="landing-page">
      <header className="site-header page-shell">
        <BrandMark />
        <nav className="front-door-navigation" aria-label="Home navigation">
          <Link className="front-door-navigation__account" to="/account">
            <CircleUserRound aria-hidden="true" />
            <span>Account</span><small>账号</small>
          </Link>
        </nav>
      </header>

      <section className="front-door-hero">
        <div className="front-door-hero__inner page-shell">
          <p className="front-door-hero__edition">
            UK UNIVERSITY ADMISSION TESTS · 2027 ENTRY
          </p>
          <h1 lang="en">No more anxiety over admission tests.</h1>
          <p className="front-door-hero__slogan-zh" lang="zh-CN">不再为升学考试而焦虑</p>
          <p className="front-door-hero__lead" lang="en">
            Choose your test, map your course coverage and practise full papers online.
          </p>
        </div>
      </section>

      <section className="exam-selector page-shell" aria-labelledby="exam-selector-title">
        <header className="exam-selector__heading">
          <h2 id="exam-selector-title" lang="en">Which admission test are you preparing for?</h2>
          <p lang="zh-CN">你正在准备哪一项考试？</p>
        </header>

        <div className="exam-entry-grid">
          {EXAM_CATALOG.map((exam, index) => (
            <Link
              className={`exam-entry exam-entry--${exam.availability}`}
              key={exam.id}
              to={exam.href}
              onClick={() => void services?.funnel?.track({
                eventType: "exam_selected",
                examId: exam.id,
                contextCode: "home-exam-selector",
              })}
            >
              <span className="exam-entry__index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{exam.name}</h3>
              <p lang="en">{exam.purpose}</p>
              <small lang="zh-CN">{exam.purposeZh}</small>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <footer className="landing-footer page-shell">
        <p><strong>Mantuo Education</strong> · Admission Test Breaker <small>由满托发起</small></p>
        <p>Complete preparation for TMUA, ESAT, TARA, LNAT and UCAT <small>完整备考空间</small></p>
      </footer>
    </main>
  );
}
