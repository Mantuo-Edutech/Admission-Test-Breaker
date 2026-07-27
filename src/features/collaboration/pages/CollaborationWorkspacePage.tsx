import { ArrowLeft, BookOpenCheck, Check, ClipboardCheck, Clock3, Eye, FilePenLine, LoaderCircle, ShieldX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { AccountPageHeader } from "../../account/components/AccountPageHeader.js";
import type { PracticeExamId } from "../../practice/catalog/assessment-registry.js";
import type {
  CollaborationArtifact,
  CollaborationArtifactKind,
  SharedLearnerAccess,
  SharedProgress,
  SharedResponseSession,
} from "../domain.js";

const examNames: Readonly<Record<PracticeExamId, string>> = {
  tmua: "TMUA", esat: "ESAT", tara: "TARA", lnat: "LNAT", ucat: "UCAT",
};

const artifactCopy: Readonly<Record<CollaborationArtifactKind, { title: string; action: string }>> = {
  annotation: { title: "Annotation", action: "Add annotation" },
  plan: { title: "Training plan", action: "Create plan" },
  assignment: { title: "Practice assignment", action: "Assign practice" },
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function shortReference(value: string): string {
  return `Learner Space · ${value.slice(-6).toUpperCase()}`;
}

function allowedArtifactKinds(access: SharedLearnerAccess): readonly CollaborationArtifactKind[] {
  const output: CollaborationArtifactKind[] = [];
  if (access.scopes.includes("annotations:write")) output.push("annotation");
  if (access.scopes.includes("plans:write")) output.push("plan");
  if (access.scopes.includes("assignments:write")) output.push("assignment");
  return output;
}

export function CollaborationWorkspacePage({ services }: { readonly services: AppServices }) {
  const { grantId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<SharedLearnerAccess | null>(null);
  const [progress, setProgress] = useState<SharedProgress | null>(null);
  const [responses, setResponses] = useState<readonly SharedResponseSession[]>([]);
  const [artifacts, setArtifacts] = useState<readonly CollaborationArtifact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<CollaborationArtifactKind>("annotation");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedExam = useMemo<PracticeExamId | null>(() => {
    const value = searchParams.get("exam");
    return value === "tmua" || value === "esat" || value === "tara" || value === "lnat" || value === "ucat" ? value : null;
  }, [searchParams]);

  const load = useCallback(async () => {
    if (services.collaboration?.configured !== true || grantId.length === 0) {
      setError("The collaboration-permission service is not connected.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const shared = await services.collaboration.listSharedLearners();
      const nextAccess = shared.find((item) => item.grantId === grantId) ?? null;
      if (nextAccess === null) {
        setAccess(null);
        setLoading(false);
        return;
      }
      const examId = selectedExam !== null && nextAccess.examIds.includes(selectedExam)
        ? selectedExam
        : nextAccess.examIds[0]!;
      if (selectedExam !== examId) setSearchParams({ exam: examId }, { replace: true });
      const [nextProgress, nextResponses, nextArtifacts] = await Promise.all([
        nextAccess.scopes.includes("progress:read")
          ? services.collaboration.getSharedProgress(grantId, examId)
          : Promise.resolve(null),
        nextAccess.scopes.includes("responses:read")
          ? services.collaboration.listSharedResponses(grantId, examId)
          : Promise.resolve([]),
        services.collaboration.listArtifacts(grantId),
      ]);
      setAccess(nextAccess);
      setProgress(nextProgress);
      setResponses(nextResponses);
      setArtifacts(nextArtifacts);
      const kinds = allowedArtifactKinds(nextAccess);
      if (kinds.length > 0 && !kinds.includes(kind)) setKind(kinds[0]!);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The collaboration space could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [grantId, kind, selectedExam, services.collaboration, setSearchParams]);

  useEffect(() => { void load(); }, [load]);

  async function createArtifact() {
    if (services.collaboration?.configured !== true || access === null || selectedExam === null) return;
    if (title.trim().length < 2 || body.trim().length < 1) {
      setError("Add a title and specific instructions.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await services.collaboration.createArtifact({
        grantId,
        kind,
        examId: selectedExam,
        title,
        body,
        ...(dueAt === "" ? {} : { dueAt: new Date(dueAt).toISOString() }),
      });
      setArtifacts((current) => [created, ...current]);
      setTitle(""); setBody(""); setDueAt("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The collaboration item could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="collaboration-page"><AccountPageHeader /><section className="practice-state-page"><LoaderCircle className="account-spinner" aria-hidden="true" /><h1>Loading learner permissions…<small lang="zh-CN">正在读取学生授权</small></h1></section></main>;
  }
  if (access === null) {
    return (
      <main className="collaboration-page"><AccountPageHeader /><section className="collaboration-denied page-shell">
        <ShieldX aria-hidden="true" /><p className="eyebrow">ACCESS DENIED</p><h1>No active permission<small lang="zh-CN">当前没有可用授权</small></h1><p>The permission may not exist, may have expired or may have been revoked. A teacher or parent role never bypasses the student's decision.</p><Link className="button button--primary" to="/collaboration">Back to collaboration</Link>
      </section>{error !== null && <p className="form-error page-shell">{error}</p>}</main>
    );
  }

  const examId = selectedExam !== null && access.examIds.includes(selectedExam) ? selectedExam : access.examIds[0]!;
  const writeKinds = allowedArtifactKinds(access);
  const progressSessions = progress?.sessions ?? [];
  const totalActiveMs = progressSessions.reduce((sum, session) => sum + session.activeMs, 0);
  const totalChanges = progressSessions.reduce((sum, session) => sum + session.answerChanges, 0);

  return (
    <main className="collaboration-page collaboration-workspace-page">
      <AccountPageHeader />
      <section className="collaboration-workspace-hero page-shell">
        <Link to="/collaboration"><ArrowLeft aria-hidden="true" />All collaboration spaces</Link>
        <div><p className="eyebrow">AUTHORIZED WORKSPACE</p><h1>{shortReference(access.learnerReference)}</h1><p>Everything below comes strictly from the student's active permission. Each sensitive read is visible in their audit.</p></div>
        <aside><strong>{access.subjectKind === "teacher" ? "Teacher access" : "Parent access"}</strong><span>Expires {formatDate(access.expiresAt)}</span></aside>
      </section>

      <nav className="collaboration-exam-tabs page-shell" aria-label="Authorised exams">
        {access.examIds.map((item) => <button key={item} type="button" aria-current={examId === item ? "page" : undefined} onClick={() => setSearchParams({ exam: item })}>{examNames[item]}</button>)}
      </nav>

      <section className="collaboration-permission-strip page-shell" aria-label="Current permissions">
        <span data-enabled={access.scopes.includes("progress:read")}><Eye aria-hidden="true" />Progress</span>
        <span data-enabled={access.scopes.includes("responses:read")}><BookOpenCheck aria-hidden="true" />Responses</span>
        <span data-enabled={access.scopes.includes("annotations:write")}><FilePenLine aria-hidden="true" />Annotations</span>
        <span data-enabled={access.scopes.includes("plans:write")}><ClipboardCheck aria-hidden="true" />Plans</span>
        <span data-enabled={access.scopes.includes("assignments:write")}><Check aria-hidden="true" />Practice</span>
      </section>

      {access.scopes.includes("progress:read") ? (
        <section className="shared-progress page-shell">
          <header><p className="eyebrow">PROGRESS FACTS</p><h2>{examNames[examId]} saved records<small lang="zh-CN">已保存记录</small></h2><span>Only observed facts are shown. No admission probability or uncalibrated ability claim is generated.</span></header>
          <div className="shared-progress__metrics">
            <article><strong>{progressSessions.length}</strong><span>Saved sessions</span></article>
            <article><strong>{progressSessions.filter((session) => session.status !== "active").length}</strong><span>Completed</span></article>
            <article><strong>{formatDuration(totalActiveMs)}</strong><span>Active time</span></article>
            <article><strong>{totalChanges}</strong><span>Answer changes</span></article>
          </div>
          {progressSessions.length === 0 ? <p className="collaboration-empty">No saved practice for this test yet.</p> : (
            <ol className="shared-session-list">{progressSessions.map((session, index) => (
              <li key={session.sessionId}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{session.paperId}</strong><small>{formatDate(session.lastActivityAt)}</small></div><dl><div><dt>Answered</dt><dd>{session.answeredCount}</dd></div><div><dt>Active time</dt><dd>{formatDuration(session.activeMs)}</dd></div><div><dt>Changes</dt><dd>{session.answerChanges}</dd></div></dl></li>
            ))}</ol>
          )}
        </section>
      ) : (
        <section className="collaboration-scope-locked page-shell"><Eye aria-hidden="true" /><h2>Progress is not authorised<small lang="zh-CN">学生没有授权查看进度</small></h2><p>The student must enable “View progress” in their sharing page. Your role cannot replace that permission.</p></section>
      )}

      {access.scopes.includes("responses:read") ? (
        <section className="shared-responses page-shell">
          <header><p className="eyebrow">QUESTION RESPONSES</p><h2>Question-level records explicitly authorised by the student<small lang="zh-CN">学生明确授权的题目级记录</small></h2><span>This is sensitive access; each view enters the student's audit.</span></header>
          {responses.length === 0 ? <p className="collaboration-empty">No authorised responses are available for this test yet.</p> : responses.map((session) => (
            <article key={session.sessionId}><div><h3>{session.paperId}</h3><span>{formatDate(session.startedAt)}</span></div><dl>{Object.entries(session.answers).map(([questionId, answer]) => <div key={questionId}><dt>{questionId}</dt><dd>{answer}</dd><small>{formatDuration(session.timingByQuestionMs[questionId] ?? 0)}</small></div>)}</dl></article>
          ))}
        </section>
      ) : (
        <section className="collaboration-scope-locked page-shell"><BookOpenCheck aria-hidden="true" /><h2>Responses remain private<small lang="zh-CN">具体作答保持私密</small></h2><p>Only summary or write access is active. Question choices, writing and time per question are not available.</p></section>
      )}

      <section className="collaboration-artifact-workspace page-shell">
        <header><p className="eyebrow">TEACHING ACTIONS</p><h2>Annotations, plans and practice assignments<small lang="zh-CN">批注、计划与练习任务</small></h2><span>Each write capability is a separate permission and never inherits another.</span></header>
        {writeKinds.length > 0 ? (
          <div className="collaboration-artifact-form">
            <label htmlFor="artifact-kind">Action</label><select id="artifact-kind" value={kind} onChange={(event) => setKind(event.target.value as CollaborationArtifactKind)}>{writeKinds.map((item) => <option key={item} value={item}>{artifactCopy[item].title}</option>)}</select>
            <label htmlFor="artifact-title">Title</label><input id="artifact-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="Example: Week 1 functions review" />
            <label htmlFor="artifact-body">Details</label><textarea id="artifact-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={5} placeholder="State what to review, what to complete and the completion standard." />
            {(kind === "plan" || kind === "assignment") && <><label htmlFor="artifact-due">Due date (optional)</label><input id="artifact-due" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></>}
            <button className="button button--primary" type="button" disabled={saving} onClick={() => void createArtifact()}>{saving ? "Saving…" : artifactCopy[kind].action}</button>
          </div>
        ) : <p className="collaboration-empty">The student has not authorised annotations, plans or practice assignments.</p>}
        <div className="collaboration-artifact-list">{artifacts.length === 0 ? <p>No collaboration items yet.</p> : artifacts.filter((item) => item.examId === examId).map((artifact) => (
          <article key={artifact.id}><span>{artifactCopy[artifact.kind].title}</span><h3>{artifact.title}</h3><p>{artifact.body}</p><footer><small>{formatDate(artifact.createdAt)}</small>{artifact.dueAt !== null && <strong><Clock3 aria-hidden="true" />Due {formatDate(artifact.dueAt)}</strong>}</footer></article>
        ))}</div>
      </section>
      {error !== null && <p className="form-error page-shell" role="alert">{error}</p>}
    </main>
  );
}
