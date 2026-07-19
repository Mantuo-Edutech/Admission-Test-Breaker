import { ChevronDown, Menu, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { EXAM_CATALOG, type ExamCatalogEntry, type ExamId } from "../../catalog/exams.js";
import { BrandMark } from "./BrandMark.js";

interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly to: string;
}

const TMUA_NAVIGATION: readonly NavigationItem[] = [
  { id: "overview", label: "TMUA 概览", to: "/exams/tmua" },
  { id: "preparation", label: "我的准备", to: "/exams/tmua/dashboard" },
  { id: "papers", label: "历年真题", to: "/exams/tmua/past-papers" },
  { id: "record", label: "学习记录", to: "/exams/tmua/record" },
  { id: "resources", label: "题库与资料", to: "/exams/tmua/resources" },
];

const ESAT_NAVIGATION: readonly NavigationItem[] = [
  { id: "overview", label: "ESAT 专业定位", to: "/exams/esat" },
  { id: "preparation", label: "我的准备", to: "/exams/esat/dashboard" },
  { id: "papers", label: "历年真题", to: "/exams/esat/past-papers" },
  { id: "record", label: "学习记录", to: "/exams/esat/record" },
  { id: "resources", label: "题库与资料", to: "/exams/esat/resources" },
];

function navigationForExam(exam: ExamCatalogEntry): readonly NavigationItem[] {
  if (exam.id === "tmua") return TMUA_NAVIGATION;
  if (exam.id === "esat") return ESAT_NAVIGATION;
  if (exam.id === "tara" || exam.id === "lnat" || exam.id === "ucat") {
    return [
      { id: "overview", label: `${exam.name} 概览`, to: exam.href },
      { id: "preparation", label: "我的准备", to: `${exam.href}/preparation` },
      { id: "papers", label: "免费在线练习", to: `${exam.href}/past-papers` },
      { id: "record", label: "学习记录", to: `${exam.href}/record` },
      { id: "resources", label: "题库与资料", to: `${exam.href}/resources` },
    ];
  }
  return [
    { id: "overview", label: `${exam.name} 概览`, to: exam.href },
    { id: "format", label: "考试结构", to: `${exam.href}#format` },
    { id: "path", label: "准备路径", to: `${exam.href}#path` },
    { id: "resources", label: "题库与资料", to: `${exam.href}/resources` },
  ];
}

function activeSection(examId: ExamId, pathname: string, hash: string): string | null {
  if (examId === "tara" || examId === "lnat" || examId === "ucat") {
    if (pathname === `/exams/${examId}/profile` || pathname === `/exams/${examId}/preparation`) return "preparation";
    if (pathname === `/exams/${examId}/past-papers`) return "papers";
    if (pathname === `/exams/${examId}/record`) return "record";
    if (pathname === `/exams/${examId}/resources`) return "resources";
    if (hash === "#path") return "path";
    if (hash === "#resources") return "resources";
    return "overview";
  }
  if (examId !== "tmua" && examId !== "esat") {
    if (pathname === `/exams/${examId}/resources`) return "resources";
    if (hash === "#format") return "format";
    if (hash === "#coverage") return "coverage";
    if (hash === "#path") return "path";
    if (hash === "#resources") return "resources";
    return "overview";
  }
  if (examId === "esat") {
    if (pathname === "/exams/esat") return "overview";
    if (pathname === "/exams/esat/past-papers") return "papers";
    if (pathname === "/exams/esat/record") return "record";
    if (pathname === "/exams/esat/resources") return "resources";
    if (["/exams/esat/profile", "/exams/esat/coverage", "/exams/esat/dashboard"].includes(pathname)) {
      return "preparation";
    }
    return null;
  }
  if (pathname === "/exams/tmua") return "overview";
  if (pathname === "/exams/tmua/past-papers" || pathname.startsWith("/practice/")) {
    return "papers";
  }
  if (pathname === "/exams/tmua/record") return "record";
  if (pathname === "/exams/tmua/resources" || pathname.startsWith("/exams/tmua/notes/")) {
    return "resources";
  }
  if (
    pathname === "/exams/tmua/profile" ||
    pathname === "/exams/tmua/coverage" ||
    pathname === "/exams/tmua/dashboard" ||
    pathname === "/exams/tmua/diagnostic"
  ) {
    return "preparation";
  }
  return null;
}

function ContextNavigationLinks({
  exam,
  pathname,
  hash,
}: {
  exam: ExamCatalogEntry;
  pathname: string;
  hash: string;
}) {
  const current = activeSection(exam.id, pathname, hash);
  return navigationForExam(exam).map((item) => (
    <Link
      className="site-navigation__link"
      key={item.id}
      to={item.to}
      aria-current={current === item.id ? "page" : undefined}
    >
      {item.label}
    </Link>
  ));
}

function ExamSwitchLinks({ currentExamId }: { currentExamId: ExamId }) {
  return (
    <>
      <Link to="/">全部考试</Link>
      {EXAM_CATALOG.map((exam) => (
        <Link
          key={exam.id}
          to={exam.href}
          aria-current={exam.id === currentExamId ? "page" : undefined}
        >
          <strong>{exam.name}</strong>
          <span>{exam.purpose}</span>
        </Link>
      ))}
    </>
  );
}

function ExamSwitcher({ exam }: { exam: ExamCatalogEntry }) {
  return (
    <details className="exam-switcher">
      <summary aria-label={`当前考试 ${exam.name}，切换考试`}>
        <span>{exam.name}</span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <nav className="exam-switcher__panel" aria-label="切换考试">
        <ExamSwitchLinks currentExamId={exam.id} />
      </nav>
    </details>
  );
}

export function SiteHeader({ examId }: { examId: ExamId }) {
  const { pathname, hash } = useLocation();
  const accountActive = /^\/(?:account|access|register|login|forgot-password|auth\/)/u.test(pathname);
  const exam = EXAM_CATALOG.find((entry) => entry.id === examId);
  if (exam === undefined) {
    throw new Error(`Missing catalog entry for exam: ${examId}`);
  }

  return (
    <header className="site-header site-navigation-header page-shell">
      <Link className="site-navigation-header__brand" to="/" aria-label="满托考试练习场首页">
        <BrandMark />
      </Link>

      <div className="site-navigation__exam--desktop">
        <ExamSwitcher exam={exam} />
      </div>
      <nav className="site-navigation site-navigation--desktop" aria-label="主要导航">
        <ContextNavigationLinks exam={exam} pathname={pathname} hash={hash} />
      </nav>
      <Link
        className="site-navigation__account site-navigation__account--desktop"
        to="/account"
        aria-current={accountActive ? "page" : undefined}
      >
        <UserRound aria-hidden="true" />
        账号
      </Link>

      <details className="site-navigation-mobile">
        <summary>
          <Menu aria-hidden="true" />
          <span>{exam.name} 导航</span>
        </summary>
        <div className="site-navigation-mobile__panel">
          <div className="site-navigation-mobile__exam">
            <span>切换考试</span>
            <div><ExamSwitchLinks currentExamId={exam.id} /></div>
          </div>
          <nav aria-label="移动端主要导航">
            <ContextNavigationLinks exam={exam} pathname={pathname} hash={hash} />
          </nav>
          <Link
            className="site-navigation__account"
            to="/account"
            aria-current={accountActive ? "page" : undefined}
          >
            <UserRound aria-hidden="true" />
            账号
          </Link>
        </div>
      </details>
    </header>
  );
}
