import { ArrowRight, ArrowUpRight, BookOpenCheck, BookOpenText, LibraryBig } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { isGuestSpaceOwner } from "../../../platform/learning-space/domain.js";
import { TmuaPageHeader } from "../components/TmuaPageHeader.js";
import { TMUA_ONLINE_PAPERS } from "../../practice/content/tmua-online-registry.js";
import type { PracticeSession } from "../../practice/domain/session.js";
import { usePreparationProfileContext } from "../../preparation-profile/hooks/usePreparationProfileContext.js";
import { TMUA_PUBLIC_SUMMARY } from "../tmua-summary.js";

const onlinePaperById = new Map(TMUA_ONLINE_PAPERS.map((paper) => [paper.id, paper]));

export function TmuaPastPapersPage({ services }: { readonly services: AppServices }) {
  const { guestSpace } = usePreparationProfileContext(services);
  const [recoverable, setRecoverable] = useState<PracticeSession | null>(null);

  useEffect(() => {
    if (guestSpace === null) return;
    let active = true;
    void services.store.loadCurrent().then((result) => {
      if (!active) return;
      const belongsToGuest =
        result.session?.learningSpaceId === guestSpace.id &&
        isGuestSpaceOwner(guestSpace, result.session.startedBy);
      const belongsToStudent =
        result.session?.learningSpaceId.startsWith("lsp_") === true &&
        result.session.startedBy.kind === "student";
      setRecoverable(
        result.session?.status === "active" && (belongsToGuest || belongsToStudent)
          ? result.session
          : null,
      );
    });
    return () => { active = false; };
  }, [guestSpace, services.store]);

  return (
    <main className="tmua-stage-page tmua-past-papers-page">
      <TmuaPageHeader />
      <section className="tmua-stage-hero page-shell">
        <p className="eyebrow">TMUA 历年真题</p>
        <h1>
          历年真题
          <span>Past Papers</span>
        </h1>
        <p>18 套历年真题全部可以在线练习。选择年份后即可计时作答、标记和提交评分。</p>
      </section>

      <section className="tmua-practice-entry page-shell" aria-label="TMUA 练习入口">
        {recoverable !== null && (
          <article className="tmua-practice-entry__resume">
            <span>继续上次练习</span>
            <h2>{Object.keys(recoverable.answers).length} 道已作答</h2>
            <Link to={`/practice/${recoverable.paperId}`}>
              继续练习<ArrowRight aria-hidden="true" />
            </Link>
          </article>
        )}
        <article className="tmua-practice-entry__diagnostic">
          <BookOpenCheck aria-hidden="true" />
          <div>
            <p>不想先消耗真题？</p>
            <h2>先做 30 分钟起点诊断</h2>
            <span>8 道满托原创题，先检查知识、推理和做题节奏。</span>
          </div>
          <Link to="/exams/tmua/diagnostic">
            查看诊断<ArrowRight aria-hidden="true" />
          </Link>
        </article>
      </section>

      <section className="tmua-archive page-shell" aria-labelledby="tmua-archive-title">
        <header className="section-heading">
          <p>完整题库 · COMPLETE LIBRARY</p>
          <h2 id="tmua-archive-title">九个版本，十八套完整试卷</h2>
          <span>每套 20 题。选择 Paper 1 或 Paper 2 后，直接进入第 1 题。</span>
        </header>

        <dl className="tmua-archive__summary" aria-label="TMUA 在线题库概况">
          <div>
            <dt>年份与版本</dt>
            <dd>
              <strong>{TMUA_PUBLIC_SUMMARY.editions.length}</strong>
              <span>Early Specimen、2016 Practice 与 2017—2023</span>
            </dd>
          </div>
          <div>
            <dt>完整试卷</dt>
            <dd>
              <strong>{TMUA_ONLINE_PAPERS.length}</strong>
              <span>Paper 1 与 Paper 2 各九套</span>
            </dd>
          </div>
          <div>
            <dt>在线题目</dt>
            <dd>
              <strong>{TMUA_PUBLIC_SUMMARY.questionShellCount}</strong>
              <span>题目、选项、公式与图形完整呈现</span>
            </dd>
          </div>
        </dl>

        <ol className="tmua-paper-shelf" aria-label="TMUA 九个年份与版本">
          {TMUA_PUBLIC_SUMMARY.editions.map((edition, editionIndex) => (
            <li key={edition.id} className="tmua-paper-edition">
              <header>
                <div>
                  <span className="tmua-paper-edition__index">
                    {String(editionIndex + 1).padStart(2, "0")}
                  </span>
                  <BookOpenText aria-hidden="true" />
                </div>
                <p>2 PAPERS · 40 QUESTIONS</p>
                <h3>{edition.label}</h3>
              </header>
              <div className="tmua-paper-edition__papers">
                {edition.papers.map((paper) => {
                  const paperId = `tmua-${edition.id}-p${paper.paper}`;
                  const onlinePaper = onlinePaperById.get(paperId);
                  if (onlinePaper === undefined) return null;
                  return (
                    <Link
                      key={paperId}
                      to={`/practice/${onlinePaper.id}`}
                      aria-label={`${edition.label} Paper ${paper.paper}，20 题，开始练习`}
                    >
                      <span>
                        <strong>Paper {paper.paper}</strong>
                        <small>20 题 · 75 分钟</small>
                      </span>
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
        <p className="tmua-archive__note">
          <LibraryBig aria-hidden="true" />
          全部 360 道真题都可以在系统内作答、标记、计时和评分，提交后直接回看整套表现。
        </p>
      </section>
    </main>
  );
}
