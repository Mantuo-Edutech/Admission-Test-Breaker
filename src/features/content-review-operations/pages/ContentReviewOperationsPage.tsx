import {
  ArrowLeft,
  BookOpenCheck,
  CheckSquare2,
  Download,
  FileSearch,
  Fingerprint,
  LoaderCircle,
  LockKeyhole,
  MonitorSmartphone,
  ShieldCheck,
  UserRoundX,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { BrandMark } from "../../navigation/components/BrandMark.js";
import {
  CONTENT_REVIEW_CAMPAIGNS,
  CONTENT_REVIEW_CAMPAIGN_LABELS,
  contentReviewExamIds,
  createContentReviewPacket,
  filterContentReviewQueue,
  type ContentReviewCampaignId,
  type ContentReviewOperationsContext,
  type ContentReviewQueueItem,
  type ContentReviewQueueSummary,
} from "../domain.js";

interface ContentReviewOperationsPageProps {
  readonly services: AppServices;
}

type PageState = "loading" | "unauthenticated" | "forbidden" | "ready" | "unavailable";

const EMPTY_SUMMARY: ContentReviewQueueSummary = {
  catalogRevision: null,
  pendingReviewItems: 0,
  affectedPublicProducts: 0,
  academicContentItems: 0,
  studentCalibrationItems: 0,
  deviceAccessibilityItems: 0,
};

const examLabels: Readonly<Record<string, string>> = {
  tmua: "TMUA",
  esat: "ESAT",
  tara: "TARA",
  lnat: "LNAT",
  ucat: "UCAT",
};

function downloadText(fileName: string, body: string, type: string): void {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadPacket(item: ContentReviewQueueItem, now: Date): void {
  const packet = createContentReviewPacket(item, now);
  downloadText(packet.evidenceFileName, packet.evidenceMarkdown, "text/markdown;charset=utf-8");
  downloadText(packet.decisionFileName, packet.decisionDraft, "application/json;charset=utf-8");
}

export function ContentReviewOperationsPage({ services }: ContentReviewOperationsPageProps) {
  const location = useLocation();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [context, setContext] = useState<ContentReviewOperationsContext | null>(null);
  const [summary, setSummary] = useState<ContentReviewQueueSummary>(EMPTY_SUMMARY);
  const [items, setItems] = useState<readonly ContentReviewQueueItem[]>([]);
  const [campaignId, setCampaignId] = useState<ContentReviewCampaignId | "all">("all");
  const [examId, setExamId] = useState<string | "all">("all");
  const review = services.contentReviewOperations;

  useEffect(() => {
    let active = true;
    async function load() {
      if (services.accountAccess?.configured !== true || review?.configured !== true) {
        if (active) setPageState("unavailable");
        return;
      }
      setPageState("loading");
      try {
        const access = await services.accountAccess.getAccessState();
        if (!active) return;
        if (access.session === null) {
          setPageState("unauthenticated");
          return;
        }
        const nextContext = await review.getContext();
        if (!active) return;
        setContext(nextContext);
        if (!nextContext.active) {
          setPageState("forbidden");
          return;
        }
        const [nextSummary, nextItems] = await Promise.all([
          review.loadSummary(),
          review.listQueue(),
        ]);
        if (!active) return;
        setSummary(nextSummary);
        setItems(nextItems);
        setPageState("ready");
      } catch {
        if (active) setPageState("unavailable");
      }
    }
    void load();
    return () => { active = false; };
  }, [review, services.accountAccess]);

  const exams = useMemo(() => contentReviewExamIds(items), [items]);
  const visibleItems = useMemo(() => filterContentReviewQueue(items, { campaignId, examId }), [campaignId, examId, items]);
  const loginState = { returnTo: `${location.pathname}${location.search}` };

  return (
    <main className="content-review-operations-page">
      <header className="site-header page-shell">
        <Link className="site-navigation-header__brand" to="/" aria-label="满托考试练习场首页"><BrandMark /></Link>
        <Link className="tmua-hub-page__back" to="/account"><ArrowLeft aria-hidden="true" />返回账号</Link>
      </header>

      {pageState === "loading" && (
        <section className="content-review-operations-state page-shell" aria-live="polite">
          <LoaderCircle className="account-spinner" aria-hidden="true" />
          <p className="eyebrow">满托内部 · CONTENT REVIEW</p>
          <h1>正在读取当前审核队列…</h1>
        </section>
      )}

      {pageState !== "loading" && pageState !== "ready" && (
        <section className="content-review-operations-state page-shell">
          {pageState === "unauthenticated"
            ? <LockKeyhole aria-hidden="true" />
            : pageState === "forbidden"
              ? <UserRoundX aria-hidden="true" />
              : <ShieldCheck aria-hidden="true" />}
          <p className="eyebrow">PRIVATE OPERATIONS · 私有教研</p>
          <h1>{pageState === "unauthenticated"
            ? "请先登录审核账号"
            : pageState === "forbidden"
              ? "当前账号没有内容审核权限"
              : "内容审核台暂时无法连接"}</h1>
          <p>{pageState === "unauthenticated"
            ? "登录后仍需单独获得内容审核权限；学生、邀请码运营和转化看板权限都不会自动开放这里。"
            : pageState === "forbidden"
              ? "审核权限独立授予；邀请码运营和转化看板权限都不会自动开放这里。普通学生账号不能查看内部审核队列或来源指纹。"
              : "请检查 Supabase 连接及内容审核队列是否已经同步。学生学习路径不会受到影响。"}</p>
          {pageState === "unauthenticated" && <Link className="button button--primary" to="/login" state={loginState}>登录并继续</Link>}
          {pageState === "forbidden" && <Link className="button button--secondary" to="/account">返回账号</Link>}
        </section>
      )}

      {pageState === "ready" && (
        <>
          <section className="content-review-operations-hero page-shell">
            <div>
              <p className="eyebrow">满托内部 · CONTENT REVIEW</p>
              <h1>每一份资料，<br />上线前都有证据<span>Review the current source, not a remembered version</span></h1>
              <p>这里把题库、模考、复习笔记和学习页面拆成可执行审核任务。打开真实页面、完成指定检查，再下载与当前来源指纹绑定的审核包。</p>
            </div>
            <aside>
              <ShieldCheck aria-hidden="true" />
              <span>当前审核账号</span>
              <strong>{context?.displayName ?? "已授权审核者"}</strong>
              <p>本页只能准备审核材料，不能直接批准或发布产品。</p>
            </aside>
          </section>

          <section className="content-review-operations-metrics page-shell" aria-label="内容审核概况">
            <article><CheckSquare2 aria-hidden="true" /><span>待审任务</span><strong>{summary.pendingReviewItems}</strong><small>个来源绑定审核组</small></article>
            <article><BookOpenCheck aria-hidden="true" /><span>涉及产品</span><strong>{summary.affectedPublicProducts}</strong><small>个公开内容产品</small></article>
            <article><UsersRound aria-hidden="true" /><span>学科与标定</span><strong>{summary.academicContentItems + summary.studentCalibrationItems}</strong><small>项需要真实人员参与</small></article>
            <article><MonitorSmartphone aria-hidden="true" /><span>设备与无障碍</span><strong>{summary.deviceAccessibilityItems}</strong><small>项真机验收</small></article>
          </section>

          <section className="content-review-operations-toolbar page-shell" aria-label="审核队列筛选">
            <div>
              <p>CURRENT CATALOG</p>
              <strong>{summary.catalogRevision ?? "尚未同步"}</strong>
              <span>显示 {visibleItems.length} / {items.length} 项</span>
            </div>
            <div className="content-review-operations-filters">
              <label>
                <span>审核类型</span>
                <select value={campaignId} onChange={(event) => setCampaignId(event.target.value as ContentReviewCampaignId | "all")}>
                  <option value="all">全部审核类型</option>
                  {CONTENT_REVIEW_CAMPAIGNS.map((campaign) => <option key={campaign} value={campaign}>{CONTENT_REVIEW_CAMPAIGN_LABELS[campaign].zh}</option>)}
                </select>
              </label>
              <label>
                <span>考试</span>
                <select value={examId} onChange={(event) => setExamId(event.target.value)}>
                  <option value="all">全部考试</option>
                  {exams.map((exam) => <option key={exam} value={exam}>{examLabels[exam] ?? exam.toUpperCase()}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="content-review-operations-queue page-shell" aria-labelledby="content-review-queue-title">
            <header>
              <div><p>REVIEW QUEUE</p><h2 id="content-review-queue-title">逐项打开，逐项留下证据</h2></div>
              <span>同一个审核任务可能覆盖多个产品；必须检查列出的全部版本和页面。</span>
            </header>
            {visibleItems.length === 0 ? (
              <div className="content-review-operations-empty"><FileSearch aria-hidden="true" /><p>当前筛选下没有待审任务。</p></div>
            ) : (
              <ol>
                {visibleItems.map((item, index) => {
                  const campaign = CONTENT_REVIEW_CAMPAIGN_LABELS[item.campaignId];
                  return (
                    <li key={item.reviewKey}>
                      <article>
                        <div className="content-review-operations-item__index">{String(index + 1).padStart(2, "0")}</div>
                        <div className="content-review-operations-item__main">
                          <p>{campaign.en}</p>
                          <h3>{campaign.zh}</h3>
                          <p className="content-review-operations-item__requirement">{item.evidenceRequirement}</p>
                          <dl>
                            <div><dt>负责人角色</dt><dd>{item.ownerRole}</dd></div>
                            <div><dt>来源文件</dt><dd>{item.sourceArtifactCount} 项</dd></div>
                            <div><dt>独立审核</dt><dd>{item.independenceRequired ? "必须" : "不强制"}</dd></div>
                          </dl>
                          <div className="content-review-operations-item__products">
                            {item.products.map((product) => (
                              <Link key={`${item.reviewKey}-${product.productId}`} to={product.route}>
                                <span>{examLabels[product.examId] ?? product.examId.toUpperCase()}</span>
                                <strong>{product.productId}</strong>
                                <small>{product.version} · 打开实际页面</small>
                              </Link>
                            ))}
                          </div>
                        </div>
                        <aside>
                          <Fingerprint aria-hidden="true" />
                          <span>当前来源指纹</span>
                          <code>{item.sourceFingerprint.slice(0, 20)}…</code>
                          <p>内容一旦改变，旧审核包自动失效。</p>
                          <button className="button button--primary" type="button" onClick={() => downloadPacket(item, services.now())}>
                            <Download aria-hidden="true" />下载审核包
                          </button>
                        </aside>
                      </article>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="content-review-operations-boundary page-shell">
            <ShieldCheck aria-hidden="true" />
            <div>
              <p>RELEASE BOUNDARY · 发布边界</p>
              <h2>下载模板不等于审核通过</h2>
              <p>适任审核者完成检查后，内容负责人还必须核对证据、明确签署结论，并把决定记录进版本化发布账本。只有来源指纹、证据哈希、角色和结论全部匹配，产品才会离开待审队列。</p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
