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
        <span>{advanced ? "深度笔记 · ADVANCED" : "基础笔记 · FOUNDATION"}</span>
      </header>
      <h2>{product.title.zh}<span>{product.title.en}</span></h2>
      <p>{product.summary}</p>
      <dl>
        {product.metrics.map((metric) => (
          <div key={`${metric.label}-${metric.value}`}>
            <dt>{metric.label}</dt><dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
      <footer>
        <span>
          {available
            ? <><CheckCircle2 aria-hidden="true" />{unlocked ? "已解锁" : "可直接阅读"}</>
            : <><KeyRound aria-hidden="true" />邀请码解锁</>}
        </span>
        {available ? (
          <Link to={product.route!}>
            {product.actionLabel ?? (advanced ? "打开深度笔记" : "阅读基础笔记")}
            <ArrowRight aria-hidden="true" />
          </Link>
        ) : (
          <button type="button" onClick={onRequestAccess}>
            获取深度笔记
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
        <p className="eyebrow">复习笔记 · REVIEW NOTES</p>
        <h1>先补基础，再看深度<span>{exam.name} FOUNDATION & ADVANCED NOTES</span></h1>
        <p>基础笔记帮助你快速补齐考试语言和核心方法；深度笔记进一步拆解真题思路、易错点和训练安排。</p>
      </section>

      <section className="exam-notes-section page-shell" aria-labelledby="foundation-notes-title">
        <header className="exam-module-heading">
          <span>01</span>
          <div>
            <p>FOUNDATION</p>
            <h2 id="foundation-notes-title">基础复习笔记</h2>
            <small>适合第一次系统准备，先建立完整知识框架。</small>
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
              <p>ADVANCED</p>
              <h2 id="advanced-notes-title">深度笔记与逐题精讲</h2>
              <small>适合已经开始刷题，希望把失分原因转化为具体训练动作。</small>
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
