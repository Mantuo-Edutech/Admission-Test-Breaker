import {
  BookOpenCheck,
  Check,
  ClipboardCheck,
  Clock3,
  Copy,
  Eye,
  FilePenLine,
  LoaderCircle,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { AccountPageHeader } from "../../account/components/AccountPageHeader.js";
import type { PracticeExamId } from "../../practice/catalog/assessment-registry.js";
import {
  collaborationExamIds,
  collaborationScopes,
  hasCollaborationInviteErrors,
  validateCollaborationInvite,
  type CollaborationArtifact,
  type CollaborationAuditEvent,
  type CollaborationGrantSummary,
  type CollaborationInviteSummary,
  type CollaborationScope,
  type CollaborationSubjectKind,
  type IssuedCollaborationInvite,
} from "../domain.js";

const scopeCopy: Readonly<Record<CollaborationScope, { title: string; detail: string }>> = {
  "progress:read": { title: "查看进度", detail: "练习频率、活跃用时、完成状态和汇总事实" },
  "responses:read": { title: "查看具体作答", detail: "每题选择、写作正文和逐题用时，敏感程度更高" },
  "annotations:write": { title: "添加批注", detail: "在你的协作空间留下学习反馈" },
  "plans:write": { title: "制定计划", detail: "创建结构化训练计划与截止时间" },
  "assignments:write": { title: "布置练习", detail: "给出明确练习任务与截止时间" },
};

const examNames: Readonly<Record<PracticeExamId, string>> = {
  tmua: "TMUA", esat: "ESAT", tara: "TARA", lnat: "LNAT", ucat: "UCAT",
};

const auditCopy: Readonly<Record<CollaborationAuditEvent["eventType"], string>> = {
  invite_created: "创建协作邀请",
  invite_revoked: "撤销未使用邀请",
  grant_redeemed: "对方兑换并获得授权",
  grant_revoked: "学生撤销授权",
  progress_viewed: "协作者查看汇总进度",
  responses_viewed: "协作者查看具体作答",
  annotation_created: "协作者添加批注",
  plan_created: "协作者制定计划",
  assignment_created: "协作者布置练习",
};

interface SharingState {
  readonly loading: boolean;
  readonly signedIn: boolean;
  readonly invites: readonly CollaborationInviteSummary[];
  readonly grants: readonly CollaborationGrantSummary[];
  readonly audit: readonly CollaborationAuditEvent[];
  readonly artifacts: Readonly<Record<string, readonly CollaborationArtifact[]>>;
  readonly error: string | null;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function shortReference(value: string): string {
  return `账号 · ${value.slice(-6).toUpperCase()}`;
}

export function SharingPage({ services }: { readonly services: AppServices }) {
  const collaboration = services.collaboration;
  const account = services.accountAccess;
  const [state, setState] = useState<SharingState>({
    loading: true,
    signedIn: false,
    invites: [],
    grants: [],
    audit: [],
    artifacts: {},
    error: null,
  });
  const [subjectKind, setSubjectKind] = useState<CollaborationSubjectKind>("teacher");
  const [scopes, setScopes] = useState<readonly CollaborationScope[]>(["progress:read"]);
  const [examIds, setExamIds] = useState<readonly PracticeExamId[]>(["tmua"]);
  const [grantDays, setGrantDays] = useState(30);
  const [issued, setIssued] = useState<IssuedCollaborationInvite | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (account?.configured !== true || collaboration?.configured !== true) {
      setState((current) => ({ ...current, loading: false, error: "协作授权服务尚未连接" }));
      return;
    }
    try {
      const access = await account.getAccessState();
      if (access.session === null) {
        setState((current) => ({ ...current, loading: false, signedIn: false, error: null }));
        return;
      }
      const [invites, grants, audit] = await Promise.all([
        collaboration.listMyInvites(),
        collaboration.listMyGrants(),
        collaboration.listMyAudit(50),
      ]);
      const artifactEntries = await Promise.all(grants.map(async (grant) => (
        [grant.id, await collaboration.listArtifacts(grant.id)] as const
      )));
      setState({
        loading: false,
        signedIn: true,
        invites,
        grants,
        audit,
        artifacts: Object.fromEntries(artifactEntries),
        error: null,
      });
    } catch (reason) {
      setState((current) => ({
        ...current,
        loading: false,
        error: reason instanceof Error ? reason.message : "暂时无法读取授权状态",
      }));
    }
  }, [account, collaboration]);

  useEffect(() => { void load(); }, [load]);

  function toggleScope(scope: CollaborationScope) {
    setScopes((current) => current.includes(scope)
      ? current.filter((item) => item !== scope)
      : [...current, scope]);
  }

  function toggleExam(examId: PracticeExamId) {
    setExamIds((current) => current.includes(examId)
      ? current.filter((item) => item !== examId)
      : [...current, examId]);
  }

  async function issueInvite() {
    if (collaboration?.configured !== true) return;
    const input = { subjectKind, scopes, examIds, grantDays } as const;
    const validation = validateCollaborationInvite(input);
    if (hasCollaborationInviteErrors(validation)) {
      setFormError(Object.values(validation)[0] ?? "请检查授权设置");
      return;
    }
    setWorking(true);
    setFormError(null);
    setIssued(null);
    try {
      setIssued(await collaboration.issueInvite(input));
      await load();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "协作邀请创建失败");
    } finally {
      setWorking(false);
    }
  }

  async function cancelInvite(inviteId: string) {
    if (collaboration?.configured !== true) return;
    setWorking(true);
    setFormError(null);
    try {
      await collaboration.cancelMyInvite(inviteId);
      await load();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "撤销邀请失败");
    } finally {
      setWorking(false);
    }
  }

  async function revokeGrant(grantId: string) {
    if (collaboration?.configured !== true) return;
    setWorking(true);
    setFormError(null);
    try {
      await collaboration.revokeMyGrant(grantId);
      await load();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "撤销授权失败");
    } finally {
      setWorking(false);
    }
  }

  async function copyCode() {
    if (issued === null) return;
    await navigator.clipboard.writeText(issued.code);
    setCopied(true);
  }

  return (
    <main className="collaboration-page sharing-page">
      <AccountPageHeader />
      {state.loading && (
        <section className="practice-state-page" aria-live="polite">
          <LoaderCircle className="account-spinner" aria-hidden="true" />
          <p className="eyebrow">CONSENT & GRANTS</p>
          <h1>正在读取你的授权…</h1>
        </section>
      )}
      {!state.loading && !state.signedIn && (
        <section className="collaboration-auth-state page-shell">
          <ShieldCheck aria-hidden="true" />
          <p className="eyebrow">由学生决定 · STUDENT CONTROLLED</p>
          <h1>登录后管理学习数据授权</h1>
          <p>老师、家长、冰冰或 Agent 都不会自动看到你的记录。每项权限都必须由你本人选择、限时授权，并且可以立即撤销。</p>
          <div><Link className="button button--primary" to="/login">登录</Link><Link className="button button--secondary" to="/register">注册账号</Link></div>
        </section>
      )}
      {!state.loading && state.signedIn && (
        <>
          <section className="collaboration-hero page-shell">
            <div>
              <p className="eyebrow">DATA SHARING · 学习数据授权</p>
              <h1>由你决定谁能看到什么</h1>
              <p>选择对象、考试、具体权限和有效期。系统生成一次性协作码，不要求填写对方邮箱，也不会把内容权限误当成数据权限。</p>
            </div>
            <aside><ShieldCheck aria-hidden="true" /><strong>随时撤销</strong><span>撤销后，对方下一次读取立即失败。</span></aside>
          </section>

          <section className="collaboration-builder page-shell" aria-labelledby="sharing-builder-title">
            <header>
              <p className="eyebrow">01 · CREATE A GRANT</p>
              <h2 id="sharing-builder-title">创建一次性协作邀请</h2>
            </header>

            <fieldset className="collaboration-choice-row">
              <legend>授权给谁</legend>
              {(["teacher", "parent"] as const).map((kind) => (
                <button key={kind} type="button" data-selected={subjectKind === kind} onClick={() => setSubjectKind(kind)}>
                  <UsersRound aria-hidden="true" /><strong>{kind === "teacher" ? "老师 · Teacher" : "家长 · Parent"}</strong>
                  <span>{kind === "teacher" ? "适合查看、批注、计划和布置练习" : "适合查看进度或经你允许查看具体作答"}</span>
                </button>
              ))}
            </fieldset>

            <fieldset className="collaboration-scope-grid">
              <legend>逐项选择权限</legend>
              {collaborationScopes.map((scope) => (
                <label key={scope} data-selected={scopes.includes(scope)}>
                  <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} />
                  {scope === "progress:read" ? <Eye aria-hidden="true" />
                    : scope === "responses:read" ? <BookOpenCheck aria-hidden="true" />
                      : scope === "annotations:write" ? <FilePenLine aria-hidden="true" />
                        : scope === "plans:write" ? <ClipboardCheck aria-hidden="true" />
                          : <Check aria-hidden="true" />}
                  <strong>{scopeCopy[scope].title}</strong>
                  <span>{scopeCopy[scope].detail}</span>
                </label>
              ))}
            </fieldset>

            <fieldset className="collaboration-exam-grid">
              <legend>授权哪些考试</legend>
              {collaborationExamIds.map((examId) => (
                <label key={examId} data-selected={examIds.includes(examId)}>
                  <input type="checkbox" checked={examIds.includes(examId)} onChange={() => toggleExam(examId)} />
                  <strong>{examNames[examId]}</strong><span>{examIds.includes(examId) ? "已包括" : "不包括"}</span>
                </label>
              ))}
            </fieldset>

            <div className="collaboration-duration">
              <label htmlFor="collaboration-grant-days">授权有效期</label>
              <select id="collaboration-grant-days" value={grantDays} onChange={(event) => setGrantDays(Number(event.target.value))}>
                <option value={7}>7 天</option><option value={30}>30 天</option><option value={90}>90 天</option><option value={180}>180 天</option>
              </select>
              <span>协作码本身 7 天内有效；对方兑换后开始计算授权时间。</span>
            </div>
            <button className="button button--primary" type="button" disabled={working} onClick={() => void issueInvite()}>
              <UserRoundCheck aria-hidden="true" />{working ? "正在创建…" : "生成一次性协作码"}
            </button>
            {formError !== null && <p className="form-error" role="alert">{formError}</p>}

            {issued !== null && (
              <div className="collaboration-code" aria-live="polite">
                <div><p>只显示这一次</p><strong>{issued.code}</strong><span>请通过你信任的方式发给对方；不要公开发布。</span></div>
                <button type="button" onClick={() => void copyCode()}><Copy aria-hidden="true" />{copied ? "已复制" : "复制协作码"}</button>
              </div>
            )}
          </section>

          <section className="collaboration-ledger page-shell" aria-labelledby="active-grants-title">
            <header><div><p className="eyebrow">02 · ACTIVE AUTHORITY</p><h2 id="active-grants-title">当前授权与邀请</h2></div><span>{state.grants.filter((grant) => grant.status === "active").length} 项有效授权</span></header>
            <div className="collaboration-ledger__columns">
              <div>
                <h3>已生效授权</h3>
                {state.grants.length === 0 ? <p className="collaboration-empty">还没有人兑换你的协作码。</p> : (
                  <ul>{state.grants.map((grant) => (
                    <li key={grant.id} data-status={grant.status}>
                      <div><strong>{grant.subjectKind === "teacher" ? "老师" : "家长"} · {shortReference(grant.subjectReference)}</strong><span>{grant.examIds.map((examId) => examNames[examId]).join(" · ")}</span></div>
                      <p>{grant.scopes.map((scope) => scopeCopy[scope].title).join("、")}</p>
                      <small>{grant.status === "active" ? `有效至 ${formatDate(grant.expiresAt)}` : grant.status === "revoked" ? "已撤销" : "已过期"}</small>
                      {grant.status === "active" && <button type="button" disabled={working} onClick={() => void revokeGrant(grant.id)}><X aria-hidden="true" />立即撤销</button>}
                      {(state.artifacts[grant.id]?.length ?? 0) > 0 && (
                        <div className="collaboration-owner-artifacts">
                          {state.artifacts[grant.id]!.map((artifact) => <p key={artifact.id}><strong>{artifact.title}</strong><span>{artifact.body}</span></p>)}
                        </div>
                      )}
                    </li>
                  ))}</ul>
                )}
              </div>
              <div>
                <h3>协作邀请</h3>
                {state.invites.length === 0 ? <p className="collaboration-empty">暂时没有邀请记录。</p> : (
                  <ul>{state.invites.map((invite) => (
                    <li key={invite.id} data-status={invite.status}>
                      <div><strong>{invite.subjectKind === "teacher" ? "老师" : "家长"}邀请</strong><span>{invite.examIds.map((examId) => examNames[examId]).join(" · ")}</span></div>
                      <p>{invite.scopes.map((scope) => scopeCopy[scope].title).join("、")}</p>
                      <small>{invite.status === "pending" ? `协作码有效至 ${formatDate(invite.inviteExpiresAt)}` : invite.status === "redeemed" ? "已兑换" : invite.status === "expired" ? "已过期" : "已撤销"}</small>
                      {invite.status === "pending" && <button type="button" disabled={working} onClick={() => void cancelInvite(invite.id)}><X aria-hidden="true" />撤销邀请</button>}
                    </li>
                  ))}</ul>
                )}
              </div>
            </div>
          </section>

          <section className="collaboration-audit page-shell" aria-labelledby="collaboration-audit-title">
            <header><p className="eyebrow">03 · ACCESS AUDIT</p><h2 id="collaboration-audit-title">谁在什么时候做了什么</h2><span>成功的敏感读取和协作动作才会进入审计；失败请求不会伪装成成功。</span></header>
            {state.audit.length === 0 ? <p className="collaboration-empty">暂无授权活动。</p> : (
              <ol>{state.audit.map((event, index) => (
                <li key={`${event.occurredAt}-${event.eventType}-${index}`}>
                  <Clock3 aria-hidden="true" /><div><strong>{auditCopy[event.eventType]}</strong><span>{event.examId === null ? "全部授权流程" : examNames[event.examId]} · {shortReference(event.actorReference)}</span></div><time>{formatDate(event.occurredAt)}</time>
                </li>
              ))}</ol>
            )}
          </section>
          {state.error !== null && <p className="form-error page-shell" role="alert">{state.error}</p>}
        </>
      )}
    </main>
  );
}
