import { ArrowRight, KeyRound, LoaderCircle, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { AccountPageHeader } from "../../account/components/AccountPageHeader.js";
import type { SharedLearnerAccess } from "../domain.js";

function shortReference(value: string): string {
  return `学生学习空间 · ${value.slice(-6).toUpperCase()}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

export function CollaborationHomePage({ services }: { readonly services: AppServices }) {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [shared, setShared] = useState<readonly SharedLearnerAccess[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (services.accountAccess?.configured !== true || services.collaboration?.configured !== true) {
        if (active) { setError("协作授权服务尚未连接"); setLoading(false); }
        return;
      }
      try {
        const access = await services.accountAccess.getAccessState();
        if (!active) return;
        setSignedIn(access.session !== null);
        if (access.session !== null) setShared(await services.collaboration.listSharedLearners());
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "暂时无法读取协作空间");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [services.accountAccess, services.collaboration]);

  return (
    <main className="collaboration-page collaboration-home-page">
      <AccountPageHeader />
      {loading ? (
        <section className="practice-state-page"><LoaderCircle className="account-spinner" aria-hidden="true" /><h1>正在读取协作空间…</h1></section>
      ) : !signedIn ? (
        <section className="collaboration-auth-state page-shell">
          <ShieldCheck aria-hidden="true" /><p className="eyebrow">PRIVATE COLLABORATION</p><h1>登录后查看学生授权给你的空间</h1>
          <p>老师或家长身份本身不提供任何权限。你只能看到学生逐项授权、尚未过期且没有撤销的数据。</p>
          <Link className="button button--primary" to="/login">登录</Link>
        </section>
      ) : (
        <>
          <section className="collaboration-hero page-shell">
            <div><p className="eyebrow">COLLABORATION SPACE · 协作空间</p><h1>只处理学生授权给你的学习任务</h1><p>查看、批注、制定计划和布置练习是五项独立权限。每次敏感读取和写入都会进入学生可见的审计。</p></div>
            <aside><ShieldCheck aria-hidden="true" /><strong>最小权限</strong><span>没有授权的考试、答案和动作不会出现在页面中。</span></aside>
          </section>
          <section className="shared-learner-list page-shell">
            <header><div><p className="eyebrow">AUTHORIZED LEARNERS</p><h2>已授权学习空间</h2></div><Link to="/collaboration/redeem"><KeyRound aria-hidden="true" />兑换新的协作码</Link></header>
            {shared.length === 0 ? (
              <div className="collaboration-empty-state"><UsersRound aria-hidden="true" /><h3>还没有学生授权</h3><p>请让学生在自己的账号页创建协作码，再由你本人登录兑换。</p><Link className="button button--primary" to="/collaboration/redeem">输入协作码</Link></div>
            ) : (
              <div>{shared.map((access) => (
                <article key={access.grantId}>
                  <span>{access.subjectKind === "teacher" ? "TEACHER" : "PARENT"}</span>
                  <h3>{shortReference(access.learnerReference)}</h3>
                  <p>{access.examIds.map((exam) => exam.toUpperCase()).join(" · ")}</p>
                  <dl><div><dt>权限</dt><dd>{access.scopes.length} 项</dd></div><div><dt>有效至</dt><dd>{formatDate(access.expiresAt)}</dd></div></dl>
                  <Link to={`/collaboration/${access.grantId}?exam=${access.examIds[0]}`}>打开协作空间<ArrowRight aria-hidden="true" /></Link>
                </article>
              ))}</div>
            )}
          </section>
        </>
      )}
      {error !== null && <p className="form-error page-shell" role="alert">{error}</p>}
    </main>
  );
}
