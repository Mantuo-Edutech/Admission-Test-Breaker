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
  "progress:read": { title: "View progress", detail: "Practice frequency, active time, completion and summary facts" },
  "responses:read": { title: "View responses", detail: "Question choices, writing and time per question; more sensitive" },
  "annotations:write": { title: "Add annotations", detail: "Leave learning feedback in the collaboration space" },
  "plans:write": { title: "Create plans", detail: "Build a structured training plan with deadlines" },
  "assignments:write": { title: "Assign practice", detail: "Set a clear practice task and deadline" },
};

const examNames: Readonly<Record<PracticeExamId, string>> = {
  tmua: "TMUA", esat: "ESAT", tara: "TARA", lnat: "LNAT", ucat: "UCAT",
};

const auditCopy: Readonly<Record<CollaborationAuditEvent["eventType"], string>> = {
  invite_created: "Collaboration invite created",
  invite_revoked: "Unused invite revoked",
  grant_redeemed: "Permission redeemed",
  grant_revoked: "Permission revoked by student",
  progress_viewed: "Summary progress viewed",
  responses_viewed: "Question responses viewed",
  annotation_created: "Annotation added",
  plan_created: "Training plan created",
  assignment_created: "Practice assigned",
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
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function shortReference(value: string): string {
  return `Account · ${value.slice(-6).toUpperCase()}`;
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
      setState((current) => ({ ...current, loading: false, error: "The collaboration-permission service is not connected." }));
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
        error: reason instanceof Error ? reason.message : "Your sharing permissions could not be loaded.",
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
      setFormError(Object.values(validation)[0] ?? "Check the permission settings.");
      return;
    }
    setWorking(true);
    setFormError(null);
    setIssued(null);
    try {
      setIssued(await collaboration.issueInvite(input));
      await load();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "The collaboration invite could not be created.");
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
      setFormError(reason instanceof Error ? reason.message : "The invitation could not be revoked.");
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
      setFormError(reason instanceof Error ? reason.message : "The permission could not be revoked.");
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
          <h1>Loading your permissions…<small lang="zh-CN">正在读取你的授权</small></h1>
        </section>
      )}
      {!state.loading && !state.signedIn && (
        <section className="collaboration-auth-state page-shell">
          <ShieldCheck aria-hidden="true" />
          <p className="eyebrow">STUDENT CONTROLLED</p>
          <h1>Sign in to manage data sharing<small lang="zh-CN">登录后管理学习数据授权</small></h1>
          <p>Teachers, parents, staff and agents receive no automatic access. You choose each permission, its expiry, and can revoke it immediately.</p>
          <div><Link className="button button--primary" to="/login">Sign in</Link><Link className="button button--secondary" to="/register">Create account</Link></div>
        </section>
      )}
      {!state.loading && state.signedIn && (
        <>
          <section className="collaboration-hero page-shell">
            <div>
              <p className="eyebrow">DATA SHARING</p>
              <h1>You decide who can see what<small lang="zh-CN">由你决定谁能看到什么</small></h1>
              <p>Choose the person, exams, exact permissions and expiry. A one-time collaboration code requires no recipient email and never confuses content access with data access.</p>
            </div>
            <aside><ShieldCheck aria-hidden="true" /><strong>Revoke at any time</strong><span>The recipient's next request fails immediately.</span></aside>
          </section>

          <section className="collaboration-builder page-shell" aria-labelledby="sharing-builder-title">
            <header>
              <p className="eyebrow">01 · CREATE A GRANT</p>
              <h2 id="sharing-builder-title">Create a one-time collaboration invite<small lang="zh-CN">创建一次性协作邀请</small></h2>
            </header>

            <fieldset className="collaboration-choice-row">
              <legend>Who is this for?</legend>
              {(["teacher", "parent"] as const).map((kind) => (
                <button key={kind} type="button" data-selected={subjectKind === kind} onClick={() => setSubjectKind(kind)}>
                  <UsersRound aria-hidden="true" /><strong>{kind === "teacher" ? "Teacher" : "Parent"}</strong>
                  <span>{kind === "teacher" ? "Progress, responses, annotations, plans and assignments" : "Progress or responses, only when you permit them"}</span>
                </button>
              ))}
            </fieldset>

            <fieldset className="collaboration-scope-grid">
              <legend>Choose each permission</legend>
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
              <legend>Choose exams</legend>
              {collaborationExamIds.map((examId) => (
                <label key={examId} data-selected={examIds.includes(examId)}>
                  <input type="checkbox" checked={examIds.includes(examId)} onChange={() => toggleExam(examId)} />
                  <strong>{examNames[examId]}</strong><span>{examIds.includes(examId) ? "Included" : "Not included"}</span>
                </label>
              ))}
            </fieldset>

            <div className="collaboration-duration">
              <label htmlFor="collaboration-grant-days">Access duration</label>
              <select id="collaboration-grant-days" value={grantDays} onChange={(event) => setGrantDays(Number(event.target.value))}>
                <option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option><option value={180}>180 days</option>
              </select>
              <span>The code expires after 7 days. Access duration starts when it is redeemed.</span>
            </div>
            <button className="button button--primary" type="button" disabled={working} onClick={() => void issueInvite()}>
              <UserRoundCheck aria-hidden="true" />{working ? "Creating…" : "Generate one-time code"}
            </button>
            {formError !== null && <p className="form-error" role="alert">{formError}</p>}

            {issued !== null && (
              <div className="collaboration-code" aria-live="polite">
                <div><p>Shown once</p><strong>{issued.code}</strong><span>Send it through a trusted channel. Never post it publicly.</span></div>
                <button type="button" onClick={() => void copyCode()}><Copy aria-hidden="true" />{copied ? "Copied" : "Copy code"}</button>
              </div>
            )}
          </section>

          <section className="collaboration-ledger page-shell" aria-labelledby="active-grants-title">
            <header><div><p className="eyebrow">02 · ACTIVE AUTHORITY</p><h2 id="active-grants-title">Active permissions and invites<small lang="zh-CN">当前授权与邀请</small></h2></div><span>{state.grants.filter((grant) => grant.status === "active").length} active</span></header>
            <div className="collaboration-ledger__columns">
              <div>
                <h3>Active permissions<small lang="zh-CN">已生效授权</small></h3>
                {state.grants.length === 0 ? <p className="collaboration-empty">No one has redeemed a collaboration code yet.</p> : (
                  <ul>{state.grants.map((grant) => (
                    <li key={grant.id} data-status={grant.status}>
                      <div><strong>{grant.subjectKind === "teacher" ? "Teacher" : "Parent"} · {shortReference(grant.subjectReference)}</strong><span>{grant.examIds.map((examId) => examNames[examId]).join(" · ")}</span></div>
                      <p>{grant.scopes.map((scope) => scopeCopy[scope].title).join(", ")}</p>
                      <small>{grant.status === "active" ? `Valid until ${formatDate(grant.expiresAt)}` : grant.status === "revoked" ? "Revoked" : "Expired"}</small>
                      {grant.status === "active" && <button type="button" disabled={working} onClick={() => void revokeGrant(grant.id)}><X aria-hidden="true" />Revoke now</button>}
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
                <h3>Collaboration invites<small lang="zh-CN">协作邀请</small></h3>
                {state.invites.length === 0 ? <p className="collaboration-empty">No collaboration invites yet.</p> : (
                  <ul>{state.invites.map((invite) => (
                    <li key={invite.id} data-status={invite.status}>
                      <div><strong>{invite.subjectKind === "teacher" ? "Teacher" : "Parent"} invite</strong><span>{invite.examIds.map((examId) => examNames[examId]).join(" · ")}</span></div>
                      <p>{invite.scopes.map((scope) => scopeCopy[scope].title).join(", ")}</p>
                      <small>{invite.status === "pending" ? `Code valid until ${formatDate(invite.inviteExpiresAt)}` : invite.status === "redeemed" ? "Redeemed" : invite.status === "expired" ? "Expired" : "Revoked"}</small>
                      {invite.status === "pending" && <button type="button" disabled={working} onClick={() => void cancelInvite(invite.id)}><X aria-hidden="true" />Revoke invite</button>}
                    </li>
                  ))}</ul>
                )}
              </div>
            </div>
          </section>

          <section className="collaboration-audit page-shell" aria-labelledby="collaboration-audit-title">
            <header><p className="eyebrow">03 · ACCESS AUDIT</p><h2 id="collaboration-audit-title">Who did what, and when<small lang="zh-CN">谁在什么时候做了什么</small></h2><span>Only successful sensitive reads and collaboration actions enter the audit.</span></header>
            {state.audit.length === 0 ? <p className="collaboration-empty">No permission activity yet.</p> : (
              <ol>{state.audit.map((event, index) => (
                <li key={`${event.occurredAt}-${event.eventType}-${index}`}>
                  <Clock3 aria-hidden="true" /><div><strong>{auditCopy[event.eventType]}</strong><span>{event.examId === null ? "All permission activity" : examNames[event.examId]} · {shortReference(event.actorReference)}</span></div><time>{formatDate(event.occurredAt)}</time>
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
