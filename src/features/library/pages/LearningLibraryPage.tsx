import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FileText,
  KeyRound,
  LibraryBig,
  MapPinned,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { EXAM_CATALOG, type ExamId } from "../../catalog/exams.js";
import { BrandMark } from "../../navigation/components/BrandMark.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { WechatAccessDialog } from "../../service-bridge/components/WechatAccessDialog.js";
import {
  CONTENT_PRODUCT_CATALOG,
  inviteContentProductsForPackages,
  publicContentProducts,
  type ContentProduct,
  type ContentProductKind,
} from "../content-product-registry.js";

interface LearningLibraryPageProps {
  readonly examId?: ExamId;
  readonly services?: AppServices;
}

const kindIcons: Readonly<Record<ContentProductKind, typeof LibraryBig>> = {
  "practice-library": LibraryBig,
  "coverage-map": MapPinned,
  "review-notes": BookOpenCheck,
  "admissions-planner": CheckCircle2,
  "preparation-map": MapPinned,
  "exam-guide": FileText,
};

const journeyStages: Readonly<Record<ContentProductKind, {
  readonly number: number;
  readonly zh: string;
  readonly en: string;
}>> = {
  "exam-guide": { number: 1, zh: "了解考试", en: "UNDERSTAND" },
  "admissions-planner": { number: 1, zh: "了解考试", en: "UNDERSTAND" },
  "coverage-map": { number: 2, zh: "完成定位", en: "POSITION" },
  "preparation-map": { number: 2, zh: "完成定位", en: "POSITION" },
  "practice-library": { number: 3, zh: "在线练习", en: "PRACTISE" },
  "review-notes": { number: 4, zh: "复习与解析", en: "REVIEW" },
};

const learnerPath = [
  { number: "01", zh: "了解考试", en: "UNDERSTAND" },
  { number: "02", zh: "完成本人定位", en: "POSITION" },
  { number: "03", zh: "进行在线练习", en: "PRACTISE" },
  { number: "04", zh: "复习与深度解析", en: "REVIEW" },
] as const;

const accessCopy = {
  public: "可直接使用",
  profile: "完成本人档案后使用",
  invite: "邀请码解锁",
  internal: "内部审核",
} as const;

function isExamId(value: string | null): value is ExamId {
  return EXAM_CATALOG.some((exam) => exam.id === value);
}

function ProductCard({
  product,
  unlocked,
}: {
  readonly product: ContentProduct;
  readonly unlocked: boolean;
}) {
  const Icon = kindIcons[product.kind];
  const journeyStage = journeyStages[product.kind];
  const defaultActionLabel = {
    "practice-library": "开始在线练习",
    "coverage-map": "填写课程并查看覆盖",
    "review-notes": "打开在线资料",
    "admissions-planner": "选择专业并定位模块",
    "preparation-map": "填写背景并查看起点",
    "exam-guide": "阅读考试指南",
  }[product.kind];
  const actionLabel = product.actionLabel ?? (product.delivery === "native-page-and-pdf"
    ? "在线阅读与下载 PDF"
    : defaultActionLabel);
  return (
    <article className="learning-product-card">
      <header>
        <span className="learning-product-card__icon"><Icon aria-hidden="true" /></span>
        <div>
          <p>STEP {String(journeyStage.number).padStart(2, "0")} · {journeyStage.zh} · {product.examId.toUpperCase()} · V{product.version}</p>
          <span className={`learning-product-card__status learning-product-card__status--${product.status}`}>
            {product.status === "published" ? "已发布" : "教学预览"}
          </span>
        </div>
      </header>
      <h2>{product.title.zh}<span>{product.title.en}</span></h2>
      <p>{product.summary}</p>
      <dl>
        {product.metrics.map((metric) => (
          <div key={`${metric.label}-${metric.value}`}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>
        ))}
      </dl>
      <footer>
        <span><ShieldCheck aria-hidden="true" />{unlocked ? "已解锁" : accessCopy[product.access]}</span>
        <Link to={product.route!}>{actionLabel}<ArrowRight aria-hidden="true" /></Link>
      </footer>
    </article>
  );
}

function GlobalLibraryHeader() {
  return (
    <header className="site-header learning-library-global-header page-shell">
      <Link to="/" aria-label="满托考试练习场首页"><BrandMark /></Link>
      <nav aria-label="资料馆导航">
        <Link to="/">选择考试</Link>
        <Link to="/library" aria-current="page">题库与资料</Link>
        <Link to="/account">账号</Link>
      </nav>
    </header>
  );
}

export function LearningLibraryPage({ examId, services }: LearningLibraryPageProps) {
  const [searchParams] = useSearchParams();
  const requestedExam = searchParams.get("exam");
  const selectedExamId = examId ?? (isExamId(requestedExam) ? requestedExam : undefined);
  const products = useMemo(() => [...publicContentProducts(selectedExamId)].sort(
    (left, right) => journeyStages[left.kind].number - journeyStages[right.kind].number,
  ), [selectedExamId]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [packageIds, setPackageIds] = useState<readonly string[]>([]);
  const selectedExam = selectedExamId === undefined
    ? null
    : EXAM_CATALOG.find((exam) => exam.id === selectedExamId) ?? null;

  useEffect(() => {
    let active = true;
    const account = services?.accountAccess;
    if (account?.configured !== true) return () => { active = false; };
    void account.getAccessState()
      .then((state) => {
        if (active) setPackageIds(state.packageIds);
      })
      .catch(() => { if (active) setPackageIds([]); });
    return () => { active = false; };
  }, [services?.accountAccess]);

  const unlockedProductIds = useMemo(
    () => new Set(inviteContentProductsForPackages(packageIds).map((product) => product.id)),
    [packageIds],
  );
  const hasSelectedExamAccess = products.some((product) => unlockedProductIds.has(product.id));

  return (
    <main className="learning-library-page">
      {examId === undefined ? <GlobalLibraryHeader /> : <SiteHeader examId={examId} />}

      <section className="learning-library-hero page-shell">
        <div>
          <p className="eyebrow">LEARNING LIBRARY · REV {CONTENT_PRODUCT_CATALOG.revision}</p>
          <h1>
            {selectedExam === null ? "真正可以打开使用的内容" : `${selectedExam.name} 题库与学习资料`}
            <span>{selectedExam === null ? "PRACTICE, COVERAGE & NOTES" : "PRACTICE & LEARNING RESOURCES"}</span>
          </h1>
          <p>
            只展示已经做成本站页面或在线题库的内容。每项资料都标明当前版本、使用条件和可核验依据。
          </p>
        </div>
        <dl>
          <div><dt>当前可用产品</dt><dd>{products.length}<span>项</span></dd></div>
          <div><dt>外部跳转</dt><dd>0<span>个主要入口</span></dd></div>
        </dl>
      </section>

      {examId === undefined && (
        <nav className="learning-library-filters page-shell" aria-label="按考试筛选资料">
          <Link to="/library" aria-current={selectedExamId === undefined ? "page" : undefined}>全部</Link>
          {EXAM_CATALOG.map((exam) => (
            <Link
              key={exam.id}
              to={`/library?exam=${exam.id}`}
              aria-current={selectedExamId === exam.id ? "page" : undefined}
            >
              {exam.name}
            </Link>
          ))}
        </nav>
      )}

      <nav className="learning-library-path page-shell" aria-label="资料使用顺序">
        <ol aria-label="资料使用顺序">
          {learnerPath.map((stage) => (
            <li key={stage.number}>
              <span>{stage.number}</span>
              <strong>{stage.zh}</strong>
              <small>{stage.en}</small>
            </li>
          ))}
        </ol>
      </nav>

      <section className="learning-product-grid page-shell" aria-label="可用题库与学习资料">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            unlocked={unlockedProductIds.has(product.id)}
          />
        ))}
        {products.length === 0 && (
          <div className="learning-library-empty">
            <FileText aria-hidden="true" />
            <h2>当前没有通过发布门的内容</h2>
            <p>来源已发现或页面结构已配置，不等于内容已经可以使用；因此这里不会展示虚假入口。</p>
          </div>
        )}
      </section>

      <section className="learning-library-access page-shell" aria-labelledby="learning-library-access-title">
        <div>
          <p className="eyebrow">{hasSelectedExamAccess ? "CONTENT ACCESS VERIFIED" : "需要确认当前可用内容？"}</p>
          <h2 id="learning-library-access-title">{hasSelectedExamAccess ? "账号权限已确认" : "添加冰冰，确认已发布版本"}</h2>
          <p>{hasSelectedExamAccess ? "已解锁；通过教研发布门并加入权限包的内容会对当前账号开放。" : "冰冰只说明已经发布的内容并协助注册，不会把草稿或计划中的资料作为可解锁内容承诺；邀请码也不会授予他人查看你的学习数据。"}</p>
        </div>
        <div>
          {hasSelectedExamAccess ? (
            <span className="learning-library-access__verified"><CheckCircle2 aria-hidden="true" />已解锁</span>
          ) : (
            <>
              <button className="button button--primary" type="button" onClick={() => setDialogOpen(true)}>
                <KeyRound aria-hidden="true" />{selectedExamId === "tmua" ? "添加冰冰，获取资料邀请码" : "添加冰冰"}
              </button>
              <Link className="button button--secondary" to="/access">已有邀请码</Link>
            </>
          )}
        </div>
      </section>

      <WechatAccessDialog
        open={dialogOpen}
        target={selectedExamId === "tmua" ? "published-learning-materials" : "review-notes"}
        examName={selectedExam?.name ?? "英国升学考试"}
        onOpenChange={setDialogOpen}
        onOpened={selectedExamId === undefined ? undefined : () => void services?.funnel?.track({
          eventType: "bingbing_opened",
          examId: selectedExamId,
          contextCode: "review-notes",
        })}
      />
    </main>
  );
}
