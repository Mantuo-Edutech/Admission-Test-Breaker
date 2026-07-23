import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Clock3,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  TicketCheck,
  UserRoundX,
  XCircle,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { BrandMark } from "../../navigation/components/BrandMark.js";
import {
  hasInviteIssueErrors,
  managedInviteDisplayStatus,
  validateInviteIssue,
  type InviteOperatorActivity,
  type InviteOperatorContext,
  type InvitePackage,
  type IssuedInvite,
  type ManagedInvite,
  type ManagedInviteDisplayStatus,
} from "../domain.js";

interface InviteOperationsPageProps {
  readonly services: AppServices;
}

type PageState = "loading" | "unauthenticated" | "forbidden" | "ready" | "unavailable";

const DAY_MS = 24 * 60 * 60 * 1000;

const statusCopy: Readonly<Record<ManagedInviteDisplayStatus, { label: string; help: string }>> = {
  available: { label: "可使用", help: "仍在有效期内且还有核销次数" },
  exhausted: { label: "已用完", help: "核销次数已经达到上限" },
  expired: { label: "已过期", help: "不能再用于注册或解锁" },
  revoked: { label: "已撤销", help: "已经停止未来核销" },
};

const activityCopy: Readonly<Record<InviteOperatorActivity["eventType"], string>> = {
  operator_granted: "运营权限已授予",
  operator_revoked: "运营权限已撤销",
  invite_issued: "邀请码已签发",
  invite_revoked: "邀请码已撤销",
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function inviteReference(id: string): string {
  return `INV-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export function InviteOperationsPage({ services }: InviteOperationsPageProps) {
  const location = useLocation();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [context, setContext] = useState<InviteOperatorContext | null>(null);
  const [packages, setPackages] = useState<readonly InvitePackage[]>([]);
  const [invites, setInvites] = useState<readonly ManagedInvite[]>([]);
  const [activity, setActivity] = useState<readonly InviteOperatorActivity[]>([]);
  const [reference, setReference] = useState("");
  const [selectedPackageIds, setSelectedPackageIds] = useState<readonly string[]>([]);
  const [maxRedemptions, setMaxRedemptions] = useState(1);
  const [expiryDays, setExpiryDays] = useState(7);
  const [entitlementDays, setEntitlementDays] = useState(30);
  const [issuing, setIssuing] = useState(false);
  const [issuedInvite, setIssuedInvite] = useState<IssuedInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeInviteId, setRevokeInviteId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const operations = services.inviteOperations;

  useEffect(() => {
    let active = true;
    async function load() {
      if (services.accountAccess?.configured !== true || operations?.configured !== true) {
        if (active) setPageState("unavailable");
        return;
      }
      try {
        const access = await services.accountAccess.getAccessState();
        if (!active) return;
        if (access.session === null) {
          setPageState("unauthenticated");
          return;
        }
        const operatorContext = await operations.getContext();
        if (!active) return;
        setContext(operatorContext);
        if (!operatorContext.active) {
          setPageState("forbidden");
          return;
        }
        const [nextPackages, nextInvites, nextActivity] = await Promise.all([
          operations.listPackages(),
          operations.listMine(),
          operations.listActivity(20),
        ]);
        if (!active) return;
        setPackages(nextPackages);
        setInvites(nextInvites);
        setActivity(nextActivity);
        setSelectedPackageIds((current) => current.length === 0 && nextPackages[0] !== undefined
          ? [nextPackages[0].id]
          : current);
        setPageState("ready");
      } catch {
        if (active) setPageState("unavailable");
      }
    }
    void load();
    return () => { active = false; };
  }, [operations, services.accountAccess]);

  const metrics = useMemo(() => {
    const now = services.now();
    return {
      total: invites.length,
      available: invites.filter((invite) => managedInviteDisplayStatus(invite, now) === "available").length,
      redemptions: invites.reduce((sum, invite) => sum + invite.redemptionCount, 0),
    };
  }, [invites, services]);

  async function refreshWorkspace() {
    if (operations?.configured !== true) return;
    const [nextInvites, nextActivity] = await Promise.all([
      operations.listMine(),
      operations.listActivity(20),
    ]);
    setInvites(nextInvites);
    setActivity(nextActivity);
  }

  async function issueInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (operations?.configured !== true || issuing) return;
    setError(null);
    setCopied(false);
    const now = services.now();
    const input = {
      reference,
      packageIds: selectedPackageIds,
      maxRedemptions,
      expiresAt: new Date(now.getTime() + expiryDays * DAY_MS).toISOString(),
      entitlementDays,
    };
    const validation = validateInviteIssue(input, now);
    if (hasInviteIssueErrors(validation)) {
      setError(Object.values(validation)[0] ?? "请检查签发设置");
      return;
    }
    setIssuing(true);
    try {
      const issued = await operations.issueInvite(input);
      setIssuedInvite(issued);
      setReference("");
      await refreshWorkspace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "邀请码暂时没有签发成功");
    } finally {
      setIssuing(false);
    }
  }

  async function copyIssuedCode() {
    if (issuedInvite === null) return;
    try {
      await navigator.clipboard.writeText(issuedInvite.code);
      setCopied(true);
    } catch {
      setError("浏览器无法自动复制，请手动选择邀请码");
    }
  }

  async function revokeInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (operations?.configured !== true || revokeInviteId === null || revoking) return;
    setError(null);
    const cleanedReason = revokeReason.trim();
    if (cleanedReason.length < 3 || cleanedReason.length > 240) {
      setError("撤销原因需要 3–240 个字符");
      return;
    }
    setRevoking(true);
    try {
      await operations.revokeMine(revokeInviteId, cleanedReason);
      setRevokeInviteId(null);
      setRevokeReason("");
      await refreshWorkspace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "邀请码暂时无法撤销");
    } finally {
      setRevoking(false);
    }
  }

  const loginState = { returnTo: `${location.pathname}${location.search}` };

  return (
    <main className="invite-operations-page">
      <header className="site-header page-shell">
        <Link className="site-navigation-header__brand" to="/" aria-label="满托考试练习场首页"><BrandMark /></Link>
        <Link className="tmua-hub-page__back" to="/account"><ArrowLeft aria-hidden="true" />返回账号</Link>
      </header>

      {pageState === "loading" && (
        <section className="invite-operations-state page-shell" aria-live="polite">
          <LoaderCircle className="account-spinner" aria-hidden="true" />
          <p className="eyebrow">满托内部 · INVITE OPERATIONS</p>
          <h1>正在确认运营权限…</h1>
        </section>
      )}

      {pageState !== "loading" && pageState !== "ready" && (
        <section className="invite-operations-state page-shell">
          {pageState === "unauthenticated" ? <LockKeyhole aria-hidden="true" /> : pageState === "forbidden" ? <UserRoundX aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
          <p className="eyebrow">PRIVATE OPERATIONS · 私有运营</p>
          <h1>{pageState === "unauthenticated" ? "请先登录运营账号" : pageState === "forbidden" ? "当前账号没有运营权限" : "运营服务暂时无法连接"}</h1>
          <p>{pageState === "unauthenticated"
            ? "登录后仍需通过单独的运营角色校验；学生账号不会获得邀请码签发能力。"
            : pageState === "forbidden"
              ? "邀请码运营权限由创始人单独授予和撤销。该页面不会展示学生学习数据。"
              : "请稍后重试；不要通过共享表格或聊天记录临时保存明文邀请码。"}</p>
          {pageState === "unauthenticated" && <Link className="button button--primary" to="/login" state={loginState}>登录并继续</Link>}
          {pageState === "forbidden" && <Link className="button button--secondary" to="/account">返回学生账号</Link>}
        </section>
      )}

      {pageState === "ready" && (
        <>
          <section className="invite-operations-hero page-shell">
            <div>
              <p className="eyebrow">满托内部 · INVITE OPERATIONS</p>
              <h1>签发邀请码，<br />核对使用状态<span>Issue invites &amp; check usage</span></h1>
              <p>仅为已经发布的真实资料创建有限邀请码。你只能查看和撤销自己创建的记录。</p>
            </div>
            <aside>
              <TicketCheck aria-hidden="true" />
              <span>当前运营账号</span>
              <strong>{context?.displayName ?? "已授权运营者"}</strong>
              <p>不显示学生身份、课程、作答或学习记录。</p>
            </aside>
          </section>

          <section className="invite-operations-metrics page-shell" aria-label="本人邀请码概况">
            <article><span>本人已签发</span><strong>{metrics.total}</strong><small>全部历史记录</small></article>
            <article><span>当前可使用</span><strong>{metrics.available}</strong><small>未过期、未撤销、未用完</small></article>
            <article><span>累计核销</span><strong>{metrics.redemptions}</strong><small>只显示次数，不显示学生身份</small></article>
          </section>

          <section className="invite-operations-workspace page-shell">
            <form className="invite-issue-form" onSubmit={(event) => void issueInvite(event)} noValidate>
              <header>
                <span>01</span>
                <div><p>ISSUE A CODE · 签发</p><h2>创建有限邀请码</h2></div>
              </header>

              <label htmlFor="invite-reference">内部参考</label>
              <input id="invite-reference" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={80} placeholder="例如：TMUA 暑期咨询 01" />
              <small>只用于你自己区分记录。不要填写学生姓名、邮箱、手机号或网址。</small>

              <fieldset className="invite-package-selector">
                <legend>选择资料包</legend>
                {packages.map((item) => {
                  const selected = selectedPackageIds.includes(item.id);
                  return (
                    <label key={item.id} className={selected ? "is-selected" : ""}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => setSelectedPackageIds((current) => selected
                          ? current.filter((id) => id !== item.id)
                          : [...current, item.id])}
                      />
                      <CheckCircle2 aria-hidden="true" />
                      <strong>{item.name}</strong>
                      <span>{item.description}</span>
                      <small>{item.publishedResourceCount} 项已发布资料 · {item.publishedResourceTitles.join("、")}</small>
                    </label>
                  );
                })}
              </fieldset>

              <div className="invite-issue-parameters">
                <label>
                  <span>可核销次数</span>
                  <select value={maxRedemptions} onChange={(event) => setMaxRedemptions(Number(event.target.value))}>
                    {[1, 2, 3, 5, 10, 20].map((value) => <option key={value} value={value}>{value} 次</option>)}
                  </select>
                </label>
                <label>
                  <span>邀请码有效期</span>
                  <select value={expiryDays} onChange={(event) => setExpiryDays(Number(event.target.value))}>
                    {[1, 3, 7, 14, 30, 60, 90].map((value) => <option key={value} value={value}>{value} 天</option>)}
                  </select>
                </label>
                <label>
                  <span>资料权限时长</span>
                  <select value={entitlementDays} onChange={(event) => setEntitlementDays(Number(event.target.value))}>
                    {[7, 30, 90, 180, 365].map((value) => <option key={value} value={value}>{value} 天</option>)}
                  </select>
                </label>
              </div>

              <div className="invite-operations-clarification">
                <ShieldCheck aria-hidden="true" />
                <p><strong>资料权限不等于数据权限。</strong>邀请码只让学生打开所选资料，不会让满托或运营者读取学生学习数据。</p>
              </div>
              {error !== null && <p className="form-error" role="alert">{error}</p>}
              <button className="button button--primary" type="submit" disabled={issuing || packages.length === 0}>{issuing ? "正在签发…" : "签发邀请码"}</button>
            </form>

            <aside className="invite-operations-rules">
              <p className="eyebrow">BEFORE YOU ISSUE · 签发前</p>
              <h2>每个邀请码都可追溯</h2>
              <ol>
                <li><strong>01</strong><span>只能选择已经交付上线的资料</span></li>
                <li><strong>02</strong><span>明文邀请码只在成功后显示一次</span></li>
                <li><strong>03</strong><span>撤销只阻止未来核销，不暗中收回已有权限</span></li>
                <li><strong>04</strong><span>运营记录不保存学生联系方式</span></li>
              </ol>
            </aside>
          </section>

          {issuedInvite !== null && (
            <section className="invite-code-reveal page-shell" aria-live="polite">
              <KeyRound aria-hidden="true" />
              <div>
                <p>只显示这一次 · COPY NOW</p>
                <h2>邀请码已经签发</h2>
                <code>{issuedInvite.code}</code>
                <span>有效至 {formatDateTime(issuedInvite.expiresAt)}。学生前往“验证邀请码”页面输入后注册。</span>
              </div>
              <div>
                <button className="button button--primary" type="button" onClick={() => void copyIssuedCode()}><Clipboard aria-hidden="true" />{copied ? "已复制" : "复制邀请码"}</button>
                <button className="button button--secondary" type="button" onClick={() => { setIssuedInvite(null); setCopied(false); }}>我已安全发送</button>
              </div>
            </section>
          )}

          <section className="invite-ledger page-shell" aria-labelledby="invite-ledger-title">
            <header><div><p className="eyebrow">MY INVITES · 本人记录</p><h2 id="invite-ledger-title">邀请码使用状态</h2></div><span>不显示核销学生身份</span></header>
            {invites.length === 0 ? (
              <div className="invite-ledger-empty"><TicketCheck aria-hidden="true" /><p>你还没有签发邀请码。完成上方表单后，记录会出现在这里。</p></div>
            ) : (
              <ol>
                {invites.map((invite, index) => {
                  const displayStatus = managedInviteDisplayStatus(invite, services.now());
                  return (
                    <li key={invite.id}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div className="invite-ledger__identity">
                        <p>{inviteReference(invite.id)}</p>
                        <h3>{invite.reference}</h3>
                        <small>{invite.packageIds.join(" · ")}</small>
                      </div>
                      <dl>
                        <div><dt>状态</dt><dd className={`invite-status invite-status--${displayStatus}`}>{statusCopy[displayStatus].label}</dd></div>
                        <div><dt>核销</dt><dd>{invite.redemptionCount} / {invite.maxRedemptions}</dd></div>
                        <div><dt>签发</dt><dd>{formatDateTime(invite.createdAt)}</dd></div>
                        <div><dt>到期</dt><dd>{formatDateTime(invite.expiresAt)}</dd></div>
                      </dl>
                      {displayStatus === "available" && (
                        <button className="invite-revoke-link" type="button" onClick={() => { setRevokeInviteId(invite.id); setRevokeReason(""); setError(null); }}><XCircle aria-hidden="true" />撤销</button>
                      )}
                      {revokeInviteId === invite.id && (
                        <form className="invite-revoke-panel" onSubmit={(event) => void revokeInvite(event)}>
                          <h4>撤销 {inviteReference(invite.id)}</h4>
                          <p>撤销后不能再注册或核销；已经获得的学生权限不会被暗中删除。</p>
                          <label htmlFor={`revoke-${invite.id}`}>撤销原因</label>
                          <input id={`revoke-${invite.id}`} value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} maxLength={240} placeholder="例如：咨询结束，不再发放" />
                          <div><button className="button button--danger" type="submit" disabled={revoking}>{revoking ? "正在撤销…" : "确认撤销"}</button><button className="button button--secondary" type="button" onClick={() => setRevokeInviteId(null)}>取消</button></div>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="invite-activity page-shell" aria-labelledby="invite-activity-title">
            <header><div><p className="eyebrow">AUDIT TRAIL · 本人审计</p><h2 id="invite-activity-title">最近运营动作</h2></div><span>仅当前运营账号可见</span></header>
            <ul>
              {activity.map((item, index) => (
                <li key={`${item.eventType}-${item.occurredAt}-${index}`}><Clock3 aria-hidden="true" /><strong>{activityCopy[item.eventType]}</strong><span>{item.inviteId === null ? "运营身份" : inviteReference(item.inviteId)}</span><time dateTime={item.occurredAt}>{formatDateTime(item.occurredAt)}</time></li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
