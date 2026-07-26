import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { EXAM_CATALOG, type ExamId } from "../../catalog/exams.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { EnglishFirstParagraph, EnglishFirstText } from "../../notes/components/EnglishFirstText.js";
import { WechatAccessDialog } from "../../service-bridge/components/WechatAccessDialog.js";
import {
  inviteContentProductsForPackages,
  publicContentProducts,
  type ContentProduct,
} from "../content-product-registry.js";

interface ExamNotesPageProps {
  readonly examId: ExamId;
  readonly services: AppServices;
}

function NotesCard({
  product,
  advanced,
  unlocked,
  onRequestAccess,
}: {
  readonly product: ContentProduct;
  readonly advanced: boolean;
  readonly unlocked: boolean;
  readonly onRequestAccess: () => void;
}) {
  const available = product.access !== "invite" || unlocked;
  return (
    <article className={`exam-notes-card${advanced ? " exam-notes-card--advanced" : ""}`}>
      <header>
        {advanced ? <Sparkles aria-hidden="true" /> : <BookOpenCheck aria-hidden="true" />}
        <span>{advanced ? "ADVANCED NOTES · 深度笔记" : "FOUNDATION NOTES · 基础笔记"}</span>
      </header>
      <h2><EnglishFirstText english={product.title.en} chinese={product.title.zh} /></h2>
      <EnglishFirstParagraph english={product.summaryEn!} chinese={product.summary} />
      <dl>
        {product.metrics.map((metric) => (
          <div key={`${metric.label}-${metric.value}`}>
            <dt><EnglishFirstText english={metric.labelEn!} chinese={metric.label} /></dt><dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
      <footer>
        <span>
          {available
            ? <><CheckCircle2 aria-hidden="true" />{unlocked ? "UNLOCKED · 已解锁" : "OPEN ACCESS · 可直接阅读"}</>
            : <><KeyRound aria-hidden="true" />INVITE ACCESS · 邀请码解锁</>}
        </span>
        {available ? (
          <Link to={product.route!}>
            <EnglishFirstText
              english={advanced ? "Open advanced notes" : "Read foundation notes"}
              chinese={product.actionLabel ?? (advanced ? "打开深度笔记" : "阅读基础笔记")}
            />
            <ArrowRight aria-hidden="true" />
          </Link>
        ) : (
          <button type="button" onClick={onRequestAccess}>
            <EnglishFirstText english="Get advanced notes" chinese="获取深度笔记" />
            <ArrowRight aria-hidden="true" />
          </button>
        )}
      </footer>
    </article>
  );
}

export function ExamNotesPage({ examId, services }: ExamNotesPageProps) {
  const exam = EXAM_CATALOG.find((entry) => entry.id === examId)!;
  const notes = useMemo(
    () => publicContentProducts(examId).filter((product) => product.kind === "review-notes"),
    [examId],
  );
  const foundationNotes = notes.filter((product) => product.access !== "invite");
  const advancedNotes = notes.filter((product) => product.access === "invite");
  const [packageIds, setPackageIds] = useState<readonly string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (services.accountAccess?.configured !== true) return () => { active = false; };
    void services.accountAccess.getAccessState()
      .then((state) => { if (active) setPackageIds(state.packageIds); })
      .catch(() => { if (active) setPackageIds([]); });
    return () => { active = false; };
  }, [services.accountAccess]);

  const unlockedIds = useMemo(
    () => new Set(inviteContentProductsForPackages(packageIds).map((product) => product.id)),
    [packageIds],
  );

  return (
    <main className="exam-notes-page">
      <SiteHeader examId={examId} />

      <section className="exam-module-hero page-shell">
        <p className="eyebrow">REVIEW NOTES · 复习笔记</p>
        <h1><EnglishFirstText english="Build the foundation. Go deeper when it matters." chinese="先补基础，再看深度" /></h1>
        <EnglishFirstParagraph
          english={`Use ${exam.name} foundation notes to master the test language and core methods. Advanced notes add worked reasoning, common traps and a focused training plan.`}
          chinese="基础笔记帮助你掌握考试语言和核心方法；深度笔记进一步拆解解题思路、易错点和训练安排。"
        />
      </section>

      <section className="exam-notes-section page-shell" aria-labelledby="foundation-notes-title">
        <header className="exam-module-heading">
          <span>01</span>
          <div>
            <p>01 · FOUNDATION</p>
            <h2 id="foundation-notes-title"><EnglishFirstText english="Foundation Review Notes" chinese="基础复习笔记" /></h2>
            <EnglishFirstParagraph english="Start here to build a complete knowledge and method map." chinese="适合第一次系统准备，先建立完整知识框架。" />
          </div>
        </header>
        <div className="exam-notes-grid">
          {foundationNotes.map((product) => (
            <NotesCard
              key={product.id}
              product={product}
              advanced={false}
              unlocked={unlockedIds.has(product.id)}
              onRequestAccess={() => setDialogOpen(true)}
            />
          ))}
        </div>
      </section>

      {advancedNotes.length > 0 && (
        <section className="exam-notes-section exam-notes-section--advanced page-shell" aria-labelledby="advanced-notes-title">
          <header className="exam-module-heading">
            <span>02</span>
            <div>
              <p>02 · ADVANCED</p>
              <h2 id="advanced-notes-title"><EnglishFirstText english="Advanced Notes & Worked Explanations" chinese="深度笔记与逐题精讲" /></h2>
              <EnglishFirstParagraph english="Use these after practice to turn lost marks into specific training actions." chinese="适合已经开始刷题，希望把失分原因转化为具体训练动作。" />
            </div>
          </header>
          <div className="exam-notes-grid">
            {advancedNotes.map((product) => (
              <NotesCard
                key={product.id}
                product={product}
                advanced
                unlocked={unlockedIds.has(product.id)}
                onRequestAccess={() => setDialogOpen(true)}
              />
            ))}
          </div>
        </section>
      )}

      <WechatAccessDialog
        open={dialogOpen}
        target="review-notes"
        examName={exam.name}
        onOpenChange={setDialogOpen}
        onOpened={() => void services.funnel?.track({
          eventType: "bingbing_opened",
          examId,
          contextCode: "advanced-notes",
        })}
      />
    </main>
  );
}
