import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { isGuestSpaceOwner } from "../../../platform/learning-space/domain.js";
import { TmuaPageHeader } from "../components/TmuaPageHeader.js";
import { CURRENT_PUBLISHED_PRACTICE_REVISIONS } from "../../practice/content/published-revisions.js";
import type { PracticeSession } from "../../practice/domain/session.js";
import { usePreparationProfileContext } from "../../preparation-profile/hooks/usePreparationProfileContext.js";
import { TMUA_PUBLIC_SUMMARY } from "../tmua-summary.js";
import {
  PracticeEntrySection,
  PracticeLibraryHero,
  type PracticeEntry,
} from "../components/PracticeLibrary.js";

const publishedTmuaPaperIds = new Set(
  CURRENT_PUBLISHED_PRACTICE_REVISIONS
    .filter((paper) => paper.exam === "TMUA")
    .map((paper) => paper.paperId),
);

const tmuaPaperEntries: readonly PracticeEntry[] = TMUA_PUBLIC_SUMMARY.editions.flatMap((edition) =>
  edition.papers.flatMap((paper) => {
    const paperId = `tmua-${edition.id}-p${paper.paper}`;
    return !publishedTmuaPaperIds.has(paperId) ? [] : [{
      id: paperId,
      to: `/practice/${paperId}`,
      kicker: edition.label,
      title: `Paper ${paper.paper}`,
      meta: "20 questions · 75 minutes",
      ariaLabel: `${edition.label}, Paper ${paper.paper}, 20 questions. Start.`,
    } satisfies PracticeEntry];
  }),
);

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
      <PracticeLibraryHero
        exam="TMUA"
        title="Choose a past paper"
        titleZh="选择历年真题"
        summary="Open any paper and start from Question 1. Your answers and time are saved online."
        summaryZh="点击任意试卷，直接进入第 1 题。"
        facts={["18 complete papers", "360 questions", "All online"]}
      />

      {recoverable !== null && (
        <section className="practice-resume-strip page-shell" aria-label="Resume your last practice">
          <div>
            <span>RESUME PRACTICE <small>继续上次练习</small></span>
            <strong>{Object.keys(recoverable.answers).length} / 20 answered</strong>
          </div>
          <Link to={`/practice/${recoverable.paperId}`}>
            Resume <small>继续</small><ArrowRight aria-hidden="true" />
          </Link>
        </section>
      )}

      <PracticeEntrySection
        eyebrow="PAST PAPERS"
        title="Historical Papers"
        titleZh="历年真题"
        summary="Early Specimen · 2016 Practice · 2017—2023"
        entries={tmuaPaperEntries}
      />
    </main>
  );
}
