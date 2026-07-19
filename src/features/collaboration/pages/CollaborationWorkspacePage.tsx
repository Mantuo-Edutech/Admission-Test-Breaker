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
  annotation: { title: "批注 · Annotation", action: "添加批注" },
  plan: { title: "训练计划 · Plan", action: "制定计划" },
  assignment: { title: "练习任务 · Assignment", action: "布置练习" },
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  return minutes < 60 ? `${minutes} 分钟` : `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`;
}

function shortReference(value: string): string {
  return `学生空间 · ${value.slice(-6).toUpperCase()}`;
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
      setError("协作授权服务尚未连接");
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
      setError(reason instanceof Error ? reason.message : "暂时无法读取协作空间");
    } finally {
      setLoading(false);
    }
  }, [grantId, kind, selectedExam, services.collaboration, setSearchParams]);

  useEffect(() => { void load(); }, [load]);

  async function createArtifact() {
    if (services.collaboration?.configured !== true || access === null || selectedExam === null) return;
    if (title.trim().length < 2 || body.trim().length < 1) {
      setError("请填写标题和具体内容");
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
      setError(reason instanceof Error ? reason.message : "协作内容没有保存成功");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="collaboration-page"><AccountPageHeader /><section className="practice-state-page"><LoaderCircle className="account-spinner" aria-hidden="true" /><h1>正在读取学生授权…</h1></section></main>;
  }
  if (access === null) {
    return (
      <main className="collaboration-page"><AccountPageHeader /><section className="collaboration-denied page-shell">
        <ShieldX aria-hidden="true" /><p className="eyebrow">ACCESS DENIED</p><h1>当前没有可用授权</h1><p>授权可能不存在、已经过期或被学生撤销。老师、家长身份不会绕过学生的决定。</p><Link className="button button--primary" to="/collaboration">返回协作空间</Link>
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
        <Link to="/collaboration"><ArrowLeft aria-hidden="true" />全部协作空间</Link>
        <div><p className="eyebrow">AUTHORIZED WORKSPACE</p><h1>{shortReference(access.learnerReference)}</h1><p>以下内容严格来自学生当前有效的授权。你看到的每次敏感读取，学生都能在自己的审计记录中查看。</p></div>
        <aside><strong>{access.subjectKind === "teacher" ? "老师权限" : "家长权限"}</strong><span>有效至 {formatDate(access.expiresAt)}</span></aside>
      </section>

      <nav className="collaboration-exam-tabs page-shell" aria-label="已授权考试">
        {access.examIds.map((item) => <button key={item} type="button" aria-current={examId === item ? "page" : undefined} onClick={() => setSearchParams({ exam: item })}>{examNames[item]}</button>)}
      </nav>

      <section className="collaboration-permission-strip page-shell" aria-label="当前具体权限">
        <span data-enabled={access.scopes.includes("progress:read")}><Eye aria-hidden="true" />进度</span>
        <span data-enabled={access.scopes.includes("responses:read")}><BookOpenCheck aria-hidden="true" />作答</span>
        <span data-enabled={access.scopes.includes("annotations:write")}><FilePenLine aria-hidden="true" />批注</span>
        <span data-enabled={access.scopes.includes("plans:write")}><ClipboardCheck aria-hidden="true" />计划</span>
        <span data-enabled={access.scopes.includes("assignments:write")}><Check aria-hidden="true" />练习</span>
      </section>

      {access.scopes.includes("progress:read") ? (
        <section className="shared-progress page-shell">
          <header><p className="eyebrow">PROGRESS FACTS · 进度事实</p><h2>{examNames[examId]} 已保存记录</h2><span>这里只显示事实，不生成录取概率或未经标定的能力结论。</span></header>
          <div className="shared-progress__metrics">
            <article><strong>{progressSessions.length}</strong><span>已保存练习</span></article>
            <article><strong>{progressSessions.filter((session) => session.status !== "active").length}</strong><span>已经完成</span></article>
            <article><strong>{formatDuration(totalActiveMs)}</strong><span>累计活跃用时</span></article>
            <article><strong>{totalChanges}</strong><span>改答次数</span></article>
          </div>
          {progressSessions.length === 0 ? <p className="collaboration-empty">该考试还没有已保存练习。</p> : (
            <ol className="shared-session-list">{progressSessions.map((session, index) => (
              <li key={session.sessionId}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{session.paperId}</strong><small>{formatDate(session.lastActivityAt)}</small></div><dl><div><dt>作答</dt><dd>{session.answeredCount} 题</dd></div><div><dt>活跃时间</dt><dd>{formatDuration(session.activeMs)}</dd></div><div><dt>改答</dt><dd>{session.answerChanges} 次</dd></div></dl></li>
            ))}</ol>
          )}
        </section>
      ) : (
        <section className="collaboration-scope-locked page-shell"><Eye aria-hidden="true" /><h2>学生没有授权查看进度</h2><p>需要学生在自己的授权页面勾选“查看进度”，现有身份不能代替这项许可。</p></section>
      )}

      {access.scopes.includes("responses:read") ? (
        <section className="shared-responses page-shell">
          <header><p className="eyebrow">QUESTION RESPONSES · 具体作答</p><h2>学生明确授权的题目级记录</h2><span>这是敏感权限；每次打开都会进入学生可见审计。</span></header>
          {responses.length === 0 ? <p className="collaboration-empty">该考试还没有可以查看的作答。</p> : responses.map((session) => (
            <article key={session.sessionId}><div><h3>{session.paperId}</h3><span>{formatDate(session.startedAt)}</span></div><dl>{Object.entries(session.answers).map(([questionId, answer]) => <div key={questionId}><dt>{questionId}</dt><dd>{answer}</dd><small>{formatDuration(session.timingByQuestionMs[questionId] ?? 0)}</small></div>)}</dl></article>
          ))}
        </section>
      ) : (
        <section className="collaboration-scope-locked page-shell"><BookOpenCheck aria-hidden="true" /><h2>具体作答保持私密</h2><p>当前只有汇总或写入权限；题目选择、写作正文和逐题用时没有开放。</p></section>
      )}

      <section className="collaboration-artifact-workspace page-shell">
        <header><p className="eyebrow">TEACHING ACTIONS · 教学协作</p><h2>批注、计划与练习任务</h2><span>每种写入能力都是独立权限，不会相互继承。</span></header>
        {writeKinds.length > 0 ? (
          <div className="collaboration-artifact-form">
            <label htmlFor="artifact-kind">动作</label><select id="artifact-kind" value={kind} onChange={(event) => setKind(event.target.value as CollaborationArtifactKind)}>{writeKinds.map((item) => <option key={item} value={item}>{artifactCopy[item].title}</option>)}</select>
            <label htmlFor="artifact-title">标题</label><input id="artifact-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="例如：第一周函数复习" />
            <label htmlFor="artifact-body">具体内容</label><textarea id="artifact-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={5} placeholder="写清楚要看什么、做什么，以及完成标准。" />
            {(kind === "plan" || kind === "assignment") && <><label htmlFor="artifact-due">截止时间（可选）</label><input id="artifact-due" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></>}
            <button className="button button--primary" type="button" disabled={saving} onClick={() => void createArtifact()}>{saving ? "正在保存…" : artifactCopy[kind].action}</button>
          </div>
        ) : <p className="collaboration-empty">学生没有开放批注、计划或布置练习权限。</p>}
        <div className="collaboration-artifact-list">{artifacts.length === 0 ? <p>还没有协作内容。</p> : artifacts.filter((item) => item.examId === examId).map((artifact) => (
          <article key={artifact.id}><span>{artifactCopy[artifact.kind].title}</span><h3>{artifact.title}</h3><p>{artifact.body}</p><footer><small>{formatDate(artifact.createdAt)}</small>{artifact.dueAt !== null && <strong><Clock3 aria-hidden="true" />截止 {formatDate(artifact.dueAt)}</strong>}</footer></article>
        ))}</div>
      </section>
      {error !== null && <p className="form-error page-shell" role="alert">{error}</p>}
    </main>
  );
}
