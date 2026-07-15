import { ArrowLeft, LibraryBig } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "../../practice/components/BrandMark.js";
import type { ExamCatalogEntry } from "../exams.js";

interface ExamStatusPageProps {
  exam: ExamCatalogEntry;
}

export function ExamStatusPage({ exam }: ExamStatusPageProps) {
  return (
    <main className="exam-status-page">
      <header className="site-header page-shell">
        <BrandMark />
        <span className="site-header__status">考试资料馆</span>
      </header>

      <section className="exam-status-page__content page-shell">
        <p className="eyebrow">{exam.name} 考试空间</p>
        <h1>{exam.name}</h1>
        <p className="exam-status-page__purpose">{exam.purpose}</p>

        <div className="exam-status-page__notice" role="status">
          <LibraryBig aria-hidden="true" />
          <div>
            <strong>{exam.statusLabel}</strong>
            <p>
              我们正在核验考试结构、官方资料与练习内容。资料达到可追溯、可验证的标准后才会开放训练。
            </p>
          </div>
        </div>

        <Link className="button button--secondary" to="/">
          <ArrowLeft aria-hidden="true" />
          返回全部考试
        </Link>
      </section>
    </main>
  );
}
