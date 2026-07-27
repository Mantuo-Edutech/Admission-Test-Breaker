import { ChevronDown, Menu, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { EXAM_CATALOG, type ExamCatalogEntry, type ExamId } from "../../catalog/exams.js";
import {
  activePrimaryModule,
  primaryNavigationForExam,
} from "../exam-navigation.js";
import { BrandMark } from "./BrandMark.js";

function ContextNavigationLinks({
  exam,
  pathname,
}: {
  exam: ExamCatalogEntry;
  pathname: string;
}) {
  const current = activePrimaryModule(exam.id, pathname);
  return primaryNavigationForExam(exam).map((item) => (
    <Link
      className={`site-navigation__link site-navigation__link--${item.id}`}
      key={item.id}
      to={item.to}
      aria-current={current === item.id ? "page" : undefined}
    >
      <span lang="en">{item.label}</span>
      <small lang="zh-CN">{item.labelZh}</small>
    </Link>
  ));
}

function ExamSwitchLinks({ currentExamId }: { currentExamId: ExamId }) {
  return (
    <>
      <Link to="/"><strong>All Tests</strong><span>全部考试</span></Link>
      {EXAM_CATALOG.map((exam) => (
        <Link
          key={exam.id}
          to={exam.href}
          aria-current={exam.id === currentExamId ? "page" : undefined}
        >
          <strong>{exam.name}</strong>
          <span lang="en">{exam.purpose}</span>
          <small lang="zh-CN">{exam.purposeZh}</small>
        </Link>
      ))}
    </>
  );
}

function ExamSwitcher({ exam }: { exam: ExamCatalogEntry }) {
  return (
    <details className="exam-switcher">
      <summary aria-label={`Current test: ${exam.name}. Switch test.`}>
        <span>{exam.name}</span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <nav className="exam-switcher__panel" aria-label="Switch test">
        <ExamSwitchLinks currentExamId={exam.id} />
      </nav>
    </details>
  );
}

export function SiteHeader({ examId }: { examId: ExamId }) {
  const { pathname } = useLocation();
  const accountActive = /^\/(?:account|access|register|login|forgot-password|auth\/)/u.test(pathname);
  const exam = EXAM_CATALOG.find((entry) => entry.id === examId);
  if (exam === undefined) {
    throw new Error(`Missing catalog entry for exam: ${examId}`);
  }

  return (
    <header className="site-header site-navigation-header page-shell">
      <Link className="site-navigation-header__brand" to="/" aria-label="UK Admission Test Prep home">
        <BrandMark />
      </Link>

      <div className="site-navigation__exam--desktop">
        <ExamSwitcher exam={exam} />
      </div>
      <nav className="site-navigation site-navigation--desktop" aria-label="Primary navigation">
        <ContextNavigationLinks exam={exam} pathname={pathname} />
      </nav>
      <Link
        className="site-navigation__account site-navigation__account--desktop"
        to="/account"
        aria-current={accountActive ? "page" : undefined}
      >
        <UserRound aria-hidden="true" />
        <span>Account</span><small>账号</small>
      </Link>

      <details className="site-navigation-mobile">
        <summary>
          <Menu aria-hidden="true" />
          <span>{exam.name} Menu</span>
        </summary>
        <div className="site-navigation-mobile__panel">
          <div className="site-navigation-mobile__exam">
            <span>Switch test <small>切换考试</small></span>
            <div><ExamSwitchLinks currentExamId={exam.id} /></div>
          </div>
          <nav aria-label="Mobile primary navigation">
            <ContextNavigationLinks exam={exam} pathname={pathname} />
          </nav>
          <Link
            className="site-navigation__account"
            to="/account"
            aria-current={accountActive ? "page" : undefined}
          >
            <UserRound aria-hidden="true" />
            <span>Account</span><small>账号</small>
          </Link>
        </div>
      </details>
    </header>
  );
}
