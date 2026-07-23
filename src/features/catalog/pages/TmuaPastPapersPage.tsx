import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { isGuestSpaceOwner } from "../../../platform/learning-space/domain.js";
import { TmuaPageHeader } from "../components/TmuaPageHeader.js";
import { TMUA_ONLINE_PAPERS } from "../../practice/content/tmua-online-registry.js";
import type { PracticeSession } from "../../practice/domain/session.js";
import { usePreparationProfileContext } from "../../preparation-profile/hooks/usePreparationProfileContext.js";
import { TMUA_PUBLIC_SUMMARY } from "../tmua-summary.js";
import {
  PracticeEntrySection,
  PracticeLibraryHero,
  type PracticeEntry,
} from "../components/PracticeLibrary.js";

const onlinePaperById = new Map(TMUA_ONLINE_PAPERS.map((paper) => [paper.id, paper]));

const tmuaPaperEntries: readonly PracticeEntry[] = TMUA_PUBLIC_SUMMARY.editions.flatMap((edition) =>
  edition.papers.flatMap((paper) => {
    const paperId = `tmua-${edition.id}-p${paper.paper}`;
    const onlinePaper = onlinePaperById.get(paperId);
    return onlinePaper === undefined ? [] : [{
      id: paperId,
      to: `/practice/${onlinePaper.id}`,
      kicker: edition.label,
      title: `Paper ${paper.paper}`,
      meta: "20 题 · 75 分钟",
      ariaLabel: `${edition.label} Paper ${paper.paper}，20 题，开始练习`,
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
        title="选择一套真题"
        titleEn="Choose a past paper"
        summary="点击任意 Paper，直接进入第 1 题。"
        facts={["18 套完整试卷", "360 道题", "全部在线作答"]}
        action={<Link className="practice-library-hero__action" to="/exams/tmua/diagnostic">不想先用真题？做 30 分钟起点诊断<ArrowRight aria-hidden="true" /></Link>}
      />

      {recoverable !== null && (
        <section className="practice-resume-strip page-shell" aria-label="继续上次练习">
          <div>
            <span>继续上次练习</span>
            <strong>{Object.keys(recoverable.answers).length} / 20 道已作答</strong>
          </div>
          <Link to={`/practice/${recoverable.paperId}`}>
            继续练习<ArrowRight aria-hidden="true" />
          </Link>
        </section>
      )}

      <PracticeEntrySection
        eyebrow="PAST PAPERS"
        title="历年真题"
        titleEn="18 papers"
        summary="Early Specimen · 2016 Practice · 2017—2023"
        entries={tmuaPaperEntries}
      />
    </main>
  );
}
