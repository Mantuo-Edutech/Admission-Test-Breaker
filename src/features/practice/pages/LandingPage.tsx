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
        <nav className="front-door-navigation" aria-label="首页导航">
          <Link className="front-door-navigation__account" to="/account">
            <CircleUserRound aria-hidden="true" />
            <span>账号</span>
          </Link>
        </nav>
      </header>

      <section className="front-door-hero">
        <div className="front-door-hero__inner page-shell">
          <p className="front-door-hero__edition">
            UK UNIVERSITY ADMISSION TESTS · 2027 ENTRY
          </p>
          <h1>不再为升学考试而焦虑</h1>
          <p className="front-door-hero__lead">
            选择考试，填写课程信息，查看需要补充的知识，然后完成诊断与真题练习。
          </p>
        </div>
      </section>

      <section className="exam-selector page-shell" aria-labelledby="exam-selector-title">
        <header className="exam-selector__heading">
          <h2 id="exam-selector-title">你正在准备哪一项考试？</h2>
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
              <p>{exam.purpose}</p>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <footer className="landing-footer page-shell">
        <p><strong>由满托发起</strong> · Admission Test Breaker</p>
        <p>面向 TMUA、ESAT、TARA、LNAT 与 UCAT 的完整备考空间</p>
      </footer>
    </main>
  );
}
