import { ArrowRight, KeyRound, LoaderCircle, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { AccountPageHeader } from "../../account/components/AccountPageHeader.js";
import type { SharedLearnerAccess } from "../domain.js";

function shortReference(value: string): string {
  return `Learner Space · ${value.slice(-6).toUpperCase()}`;
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
        if (active) { setError("The collaboration-permission service is not connected."); setLoading(false); }
        return;
      }
      try {
        const access = await services.accountAccess.getAccessState();
        if (!active) return;
        setSignedIn(access.session !== null);
        if (access.session !== null) setShared(await services.collaboration.listSharedLearners());
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "The collaboration space could not be loaded.");
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
        <section className="practice-state-page"><LoaderCircle className="account-spinner" aria-hidden="true" /><h1>Loading collaboration space…<small lang="zh-CN">正在读取协作空间</small></h1></section>
      ) : !signedIn ? (
        <section className="collaboration-auth-state page-shell">
          <ShieldCheck aria-hidden="true" /><p className="eyebrow">PRIVATE COLLABORATION</p><h1>Sign in to view learner-authorised spaces<small lang="zh-CN">登录后查看学生授权给你的空间</small></h1>
          <p>Being a teacher or parent grants no access by itself. You see only permissions the student selected that remain active and unexpired.</p>
          <Link className="button button--primary" to="/login">Sign in</Link>
        </section>
      ) : (
        <>
          <section className="collaboration-hero page-shell">
            <div><p className="eyebrow">COLLABORATION SPACE</p><h1>Only the learning tasks a student authorised<small lang="zh-CN">只处理学生授权给你的学习任务</small></h1><p>Progress, responses, annotations, plans and assignments are separate permissions. Sensitive reads and writes enter the student's audit.</p></div>
            <aside><ShieldCheck aria-hidden="true" /><strong>Least privilege</strong><span>Unauthorised exams, answers and actions never appear.</span></aside>
          </section>
          <section className="shared-learner-list page-shell">
            <header><div><p className="eyebrow">AUTHORIZED LEARNERS</p><h2>Authorised learner spaces<small lang="zh-CN">已授权学习空间</small></h2></div><Link to="/collaboration/redeem"><KeyRound aria-hidden="true" />Redeem a new code</Link></header>
            {shared.length === 0 ? (
              <div className="collaboration-empty-state"><UsersRound aria-hidden="true" /><h3>No learner permissions yet<small lang="zh-CN">还没有学生授权</small></h3><p>Ask the student to create a collaboration code in their account, then redeem it while signed in to your own account.</p><Link className="button button--primary" to="/collaboration/redeem">Enter collaboration code</Link></div>
            ) : (
              <div>{shared.map((access) => (
                <article key={access.grantId}>
                  <span>{access.subjectKind === "teacher" ? "TEACHER" : "PARENT"}</span>
                  <h3>{shortReference(access.learnerReference)}</h3>
                  <p>{access.examIds.map((exam) => exam.toUpperCase()).join(" · ")}</p>
                  <dl><div><dt>Permissions</dt><dd>{access.scopes.length}</dd></div><div><dt>Expires</dt><dd>{formatDate(access.expiresAt)}</dd></div></dl>
                  <Link to={`/collaboration/${access.grantId}?exam=${access.examIds[0]}`}>Open collaboration space<ArrowRight aria-hidden="true" /></Link>
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
