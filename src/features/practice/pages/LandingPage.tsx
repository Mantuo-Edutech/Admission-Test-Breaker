import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { EXAM_CATALOG } from "../../catalog/exams.js";
import { BrandMark } from "../../navigation/components/BrandMark.js";

const PREPARATION_PATH = [
  "选择考试",
  "填写课程信息",
  "查看知识差距",
  "完成诊断与真题",
  "跟踪准备进度",
] as const;

export function LandingPage({ services }: { services?: Pick<AppServices, "funnel"> }) {
  return (
    <main className="landing-page">
      <header className="site-header page-shell">
        <BrandMark />
        <nav className="front-door-navigation" aria-label="首页导航">
          <Link to="/library">题库与资料</Link>
          <Link to="/account">账号</Link>
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
        <header className="section-heading">
          <p>第一步</p>
          <h2 id="exam-selector-title">你正在准备哪一项考试？</h2>
          <span>选择考试后，我们会先了解你的课程背景，再安排下一步。</span>
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

      <section className="preparation-path page-shell" aria-labelledby="path-title">
        <header className="section-heading section-heading--compact">
          <p>接下来</p>
          <h2 id="path-title">从定位到练习，一步一步完成</h2>
        </header>
        <ol aria-label="完整备考路径">
          {PREPARATION_PATH.map((step, index) => (
            <li key={step} data-step={String(index + 1).padStart(2, "0")}>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <footer className="landing-footer page-shell">
        <p><strong>由满托发起</strong> · Admission Test Breaker</p>
        <p>面向 TMUA、ESAT、TARA、LNAT 与 UCAT 的完整备考空间</p>
      </footer>
    </main>
  );
}
