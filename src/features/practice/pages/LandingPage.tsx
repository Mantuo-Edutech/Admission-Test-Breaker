import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { EXAM_CATALOG } from "../../catalog/exams.js";
import { BrandMark } from "../components/BrandMark.js";

const PREPARATION_PATH = [
  "了解考试",
  "完成诊断",
  "系统训练",
  "模考复盘",
  "判断准备进度",
] as const;

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="site-header page-shell">
        <BrandMark />
        <p className="site-header__descriptor">英国大学入学考试</p>
      </header>

      <section className="front-door-hero">
        <div className="front-door-hero__inner page-shell">
          <p className="front-door-hero__edition">
            UK UNIVERSITY ADMISSION TESTS · 2027 ENTRY
          </p>
          <h1>不再为升学考试而焦虑</h1>
          <p className="front-door-hero__lead">
            从了解考试、诊断水平，到系统训练、模考复盘和准备进度判断，都在这里完成。
          </p>
        </div>
      </section>

      <section className="exam-selector page-shell" aria-labelledby="exam-selector-title">
        <header className="section-heading">
          <p>01 / CHOOSE YOUR EXAM</p>
          <h2 id="exam-selector-title">你正在准备哪一项考试？</h2>
          <span>先进入对应考试空间，再决定从了解、诊断或练习开始。</span>
        </header>

        <div className="exam-entry-grid">
          {EXAM_CATALOG.map((exam, index) => (
            <Link
              className={`exam-entry exam-entry--${exam.availability}`}
              key={exam.id}
              to={exam.href}
            >
              <span className="exam-entry__index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{exam.name}</h3>
              <p>{exam.purpose}</p>
              <span className="exam-entry__status">{exam.statusLabel}</span>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="preparation-path page-shell" aria-labelledby="path-title">
        <header className="section-heading section-heading--compact">
          <p>02 / ONE COMPLETE PATH</p>
          <h2 id="path-title">一条完整的备考路径</h2>
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
        <p>面向 TMUA、ESAT、TARA 与 UCAT 的完整备考空间</p>
      </footer>
    </main>
  );
}
