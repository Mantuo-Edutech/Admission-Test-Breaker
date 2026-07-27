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
import { EnglishFirstParagraph, EnglishFirstText } from "../../notes/components/EnglishFirstText.js";
import { WechatAccessDialog } from "../../service-bridge/components/WechatAccessDialog.js";
import {
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
  public: { en: "Open access", zh: "可直接使用" },
  profile: { en: "Profile required", zh: "完成本人档案后使用" },
  invite: { en: "Invitation access", zh: "邀请码解锁" },
  internal: { en: "Internal review", zh: "内部审核" },
} as const;

const kindLabels: Readonly<Record<ContentProductKind, { readonly en: string; readonly zh: string }>> = {
  "practice-library": { en: "ONLINE PRACTICE", zh: "在线题库" },
  "coverage-map": { en: "KNOWLEDGE COVERAGE", zh: "知识覆盖" },
  "review-notes": { en: "REVIEW NOTES", zh: "复习笔记" },
  "admissions-planner": { en: "PROGRAMME PLANNER", zh: "专业定位" },
  "preparation-map": { en: "STARTING-POINT MAP", zh: "课程定位" },
  "exam-guide": { en: "EXAM GUIDE", zh: "考试指南" },
};

const defaultEnglishSummary: Readonly<Record<ContentProductKind, string>> = {
  "practice-library": "Practise the available papers online and preserve answers, timing and review evidence.",
  "coverage-map": "Map your current curriculum against the test before deciding what to revise or learn.",
  "review-notes": "Build the knowledge, method and review language needed for deliberate practice.",
  "admissions-planner": "Choose a target programme and resolve the exact assessment modules it requires.",
  "preparation-map": "Record your curriculum and current evidence to establish a useful starting point.",
  "exam-guide": "Understand the test, its sections and the decisions required before you begin training.",
};

const defaultEnglishAction: Readonly<Record<ContentProductKind, string>> = {
  "practice-library": "Start online practice",
  "coverage-map": "Map my curriculum",
  "review-notes": "Open review notes",
  "admissions-planner": "Choose my programme",
  "preparation-map": "Set my starting point",
  "exam-guide": "Read the exam guide",
};

const metricLabelEnglish: Readonly<Record<string, string>> = {
  "一级知识单元": "Syllabus units",
  "专业要求": "Programme requirements",
  "交付方式": "Delivery",
  "具体训练": "Training sessions",
  "内容语言": "Language",
  "决策方法": "Decision methods",
  "原创例题": "Original examples",
  "原创情境": "Original scenarios",
  "原创数据组": "Original data sets",
  "原创文章": "Original passages",
  "原创题目": "Original questions",
  "原生模块": "Native modules",
  "在线题目": "Online questions",
  "复习模块": "Review modules",
  "完整例题": "Worked examples",
  "完整模考": "Full mocks",
  "完整计时": "Full timing",
  "建议时间": "Suggested time",
  "建议篇幅": "Suggested length",
  "当前版本": "Current version",
  "当前状态": "Current status",
  "必考模块": "Required modules",
  "数学模块": "Mathematics modules",
  "最高原始分": "Maximum raw score",
  "深度模块": "Advanced modules",
  "理科模块": "Science modules",
  "知识单元": "Knowledge units",
  "知识范围": "Knowledge scope",
  "考试模块": "Test modules",
  "考试部分": "Test sections",
  "能力类型": "Skill types",
  "规划模块": "Planning modules",
  "计算方式": "Scoring method",
  "训练周期": "Training period",
  "诊断时间": "Diagnostic time",
  "试卷": "Papers",
  "课程体系": "Curricula",
  "逐题解析": "Worked explanations",
  "限时": "Time limit",
  "院校": "Universities",
};

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
  const actionLabelEn = product.delivery === "native-page-and-pdf"
    ? "Read online or download the PDF"
    : defaultEnglishAction[product.kind];
  const productKind = kindLabels[product.kind];
  const access = unlocked ? { en: "Unlocked", zh: "已解锁" } : accessCopy[product.access];
  return (
    <article className="learning-product-card">
      <header>
        <span className="learning-product-card__icon"><Icon aria-hidden="true" /></span>
        <div>
          <p>STEP {String(journeyStage.number).padStart(2, "0")} · {journeyStage.en} · {product.examId.toUpperCase()} <small lang="zh-CN">{journeyStage.zh}</small></p>
          <span className={`learning-product-card__status learning-product-card__status--${product.status}`}>
            <span lang="en">{productKind.en}</span><small lang="zh-CN">{productKind.zh}</small>
          </span>
        </div>
      </header>
      <h2><span lang="en">{product.title.en}</span><small lang="zh-CN">{product.title.zh}</small></h2>
      <EnglishFirstParagraph english={product.summaryEn ?? defaultEnglishSummary[product.kind]} chinese={product.summary} />
      <dl>
        {product.metrics.map((metric) => (
          <div key={`${metric.label}-${metric.value}`}>
            <dt><span lang="en">{metric.labelEn ?? metricLabelEnglish[metric.label] ?? "Metric"}</span><small lang="zh-CN">{metric.label}</small></dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
      <footer>
        <span><ShieldCheck aria-hidden="true" /><span lang="en">{access.en}</span><small lang="zh-CN">{access.zh}</small></span>
        <Link to={product.route!}><span lang="en">{actionLabelEn}</span><small lang="zh-CN">{actionLabel}</small><ArrowRight aria-hidden="true" /></Link>
      </footer>
    </article>
  );
}

function GlobalLibraryHeader() {
  return (
    <header className="site-header learning-library-global-header page-shell">
      <Link to="/" aria-label="UK Admission Test Prep home"><BrandMark /></Link>
      <nav aria-label="Learning library navigation">
        <Link to="/"><span lang="en">Choose a test</span><small lang="zh-CN">选择考试</small></Link>
        <Link to="/library" aria-current="page"><span lang="en">Library</span><small lang="zh-CN">题库与资料</small></Link>
        <Link to="/account"><span lang="en">Account</span><small lang="zh-CN">账号</small></Link>
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
          <p className="eyebrow">PRACTICE · MOCKS · REVIEW NOTES <small lang="zh-CN">题库 · 模拟练习 · 复习笔记</small></p>
          <h1>
            <span lang="en">{selectedExam === null ? "Practice, Coverage & Review Notes" : `${selectedExam.name} Practice & Learning Resources`}</span>
            <small lang="zh-CN">{selectedExam === null ? "完整题库与复习资料" : `${selectedExam.name} 题库与学习资料`}</small>
          </h1>
          <EnglishFirstParagraph
            english="Move from understanding the test and mapping your curriculum to online practice and review notes—always with one clear next action."
            chinese="从了解考试、课程定位到在线练习和 Review Notes，按照准备顺序找到下一步需要的内容。"
          />
        </div>
        <dl>
          <div><dt><span lang="en">Learning resources</span><small lang="zh-CN">学习内容</small></dt><dd>{products.length}<span>items</span></dd></div>
          <div><dt><span lang="en">Preparation path</span><small lang="zh-CN">准备路径</small></dt><dd>4<span>steps</span></dd></div>
        </dl>
      </section>

      {examId === undefined && (
        <nav className="learning-library-filters page-shell" aria-label="Filter resources by test 按考试筛选资料">
          <Link to="/library" aria-current={selectedExamId === undefined ? "page" : undefined}>All <small lang="zh-CN">全部</small></Link>
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

      <nav className="learning-library-path page-shell" aria-label="Recommended resource order 资料使用顺序">
        <ol aria-label="Recommended resource order 资料使用顺序">
          {learnerPath.map((stage) => (
            <li key={stage.number}>
              <span>{stage.number}</span>
              <strong lang="en">{stage.en}</strong>
              <small lang="zh-CN">{stage.zh}</small>
            </li>
          ))}
        </ol>
      </nav>

      <section className="learning-product-grid page-shell" aria-label="Available practice and learning resources 可用题库与学习资料">
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
            <h2><EnglishFirstText english="No matching resources yet" chinese="暂时没有相关资料" /></h2>
            <EnglishFirstParagraph english="Choose another test or return to the test overview." chinese="请选择其他考试，或返回考试概览继续准备。" />
          </div>
        )}
      </section>

      <section className="learning-library-access page-shell" aria-labelledby="learning-library-access-title">
        <div>
          <p className="eyebrow">FULL ACCESS <small lang="zh-CN">完整资料</small></p>
          <h2 id="learning-library-access-title"><EnglishFirstText
            english={hasSelectedExamAccess ? "Your advanced resources are unlocked" : "Get advanced Review Notes from Bingbing"}
            chinese={hasSelectedExamAccess ? "完整资料已经解锁" : "添加冰冰，获取深度 Review Notes"}
          /></h2>
          <EnglishFirstParagraph
            english={hasSelectedExamAccess
              ? "This account can open its entitled review notes and worked explanations."
              : "Past papers and foundation practice remain open. Advanced notes and worked explanations use an invitation code, which never grants anyone access to your learning data."}
            chinese={hasSelectedExamAccess
              ? "当前账号可以使用已解锁的完整复习资料和深度解析。"
              : "真题与基础练习可以直接使用；深度复习笔记和逐题解析通过邀请码解锁。邀请码不会授予他人查看你的学习数据。"}
          />
        </div>
        <div>
          {hasSelectedExamAccess ? (
            <span className="learning-library-access__verified"><CheckCircle2 aria-hidden="true" />Unlocked <small lang="zh-CN">已解锁</small></span>
          ) : (
            <>
              <button className="button button--primary" type="button" onClick={() => setDialogOpen(true)}>
                <KeyRound aria-hidden="true" /><EnglishFirstText english="Get an invitation code" chinese={selectedExamId === "tmua" ? "添加冰冰，获取资料邀请码" : "添加冰冰"} />
              </button>
              <Link className="button button--secondary" to="/access"><EnglishFirstText english="I have a code" chinese="已有邀请码" /></Link>
            </>
          )}
        </div>
      </section>

      <WechatAccessDialog
        open={dialogOpen}
        target={selectedExamId === "tmua" ? "published-learning-materials" : "review-notes"}
        examName={selectedExam?.name ?? "UK admission test"}
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
