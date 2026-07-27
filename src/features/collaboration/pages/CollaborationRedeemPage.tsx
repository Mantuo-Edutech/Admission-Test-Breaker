import { ArrowRight, KeyRound, LoaderCircle, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { AccountPageHeader } from "../../account/components/AccountPageHeader.js";
import type { SharedLearnerAccess } from "../domain.js";

export function CollaborationRedeemPage({ services }: { readonly services: AppServices }) {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState<SharedLearnerAccess | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (services.accountAccess?.configured !== true) {
      setLoading(false);
      setError("The account service is not connected.");
      return () => { active = false; };
    }
    void services.accountAccess.getAccessState()
      .then((state) => { if (active) { setSignedIn(state.session !== null); setLoading(false); } })
      .catch(() => { if (active) { setError("Your sign-in status could not be confirmed."); setLoading(false); } });
    return () => { active = false; };
  }, [services.accountAccess]);

  async function redeem() {
    if (services.collaboration?.configured !== true) {
      setError("The collaboration-permission service is not connected.");
      return;
    }
    if (code.trim().length < 20) {
      setError("Enter the complete collaboration code.");
      return;
    }
    setRedeeming(true);
    setError(null);
    try {
      setRedeemed(await services.collaboration.redeemInvite(code));
      setCode("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The collaboration code could not be redeemed.");
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <main className="collaboration-page collaboration-redeem-page">
      <AccountPageHeader />
      {loading ? (
        <section className="practice-state-page"><LoaderCircle className="account-spinner" aria-hidden="true" /><h1>Checking your account…<small lang="zh-CN">正在确认账号</small></h1></section>
      ) : !signedIn ? (
        <section className="collaboration-auth-state page-shell">
          <ShieldCheck aria-hidden="true" />
          <p className="eyebrow">COLLABORATION INVITE</p>
          <h1>Sign in to your own account first<small lang="zh-CN">请先登录自己的账号</small></h1>
          <p>The code must bind to the recipient's own account. Sign-in alone grants no data access; only successful redemption activates the permissions selected by the student.</p>
          <div><Link className="button button--primary" to="/login">Sign in to redeem</Link><Link className="button button--secondary" to="/register">Create account</Link></div>
        </section>
      ) : redeemed !== null ? (
        <section className="collaboration-success page-shell">
          <UserRoundCheck aria-hidden="true" />
          <p className="eyebrow">AUTHORITY VERIFIED</p>
          <h1>Collaboration access is active<small lang="zh-CN">协作授权已经生效</small></h1>
          <p>You can access only the exams and permissions selected by the student. They can revoke access at any time; sensitive reads and writes are audited.</p>
          <dl>
            <div><dt>Role</dt><dd>{redeemed.subjectKind === "teacher" ? "Teacher" : "Parent"}</dd></div>
            <div><dt>Exams</dt><dd>{redeemed.examIds.map((exam) => exam.toUpperCase()).join(" · ")}</dd></div>
            <div><dt>Permissions</dt><dd>{redeemed.scopes.length}</dd></div>
          </dl>
          <Link className="button button--primary" to="/collaboration">Open collaboration space<ArrowRight aria-hidden="true" /></Link>
        </section>
      ) : (
        <section className="collaboration-redeem-card page-shell">
          <KeyRound aria-hidden="true" />
          <p className="eyebrow">REDEEM A STUDENT GRANT</p>
          <h1>Enter the collaboration code from the student<small lang="zh-CN">输入学生发给你的协作码</small></h1>
          <p>A collaboration code is not a content invitation code. It grants only student-selected learning-data permissions and unlocks no paid resources or other learner data.</p>
          <label htmlFor="collaboration-code">Collaboration code</label>
          <input id="collaboration-code" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="MTSHARE-…" />
          <button className="button button--primary" type="button" disabled={redeeming} onClick={() => void redeem()}>
            {redeeming ? "Verifying…" : "Verify and accept access"}
          </button>
          {error !== null && <p className="form-error" role="alert">{error}</p>}
          <Link to="/collaboration">View existing collaboration spaces</Link>
        </section>
      )}
      {!loading && error !== null && !signedIn && <p className="form-error page-shell" role="alert">{error}</p>}
    </main>
  );
}
