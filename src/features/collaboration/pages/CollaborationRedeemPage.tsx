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
      setError("账号服务尚未连接");
      return () => { active = false; };
    }
    void services.accountAccess.getAccessState()
      .then((state) => { if (active) { setSignedIn(state.session !== null); setLoading(false); } })
      .catch(() => { if (active) { setError("暂时无法确认登录状态"); setLoading(false); } });
    return () => { active = false; };
  }, [services.accountAccess]);

  async function redeem() {
    if (services.collaboration?.configured !== true) {
      setError("协作授权服务尚未连接");
      return;
    }
    if (code.trim().length < 20) {
      setError("请输入完整协作码");
      return;
    }
    setRedeeming(true);
    setError(null);
    try {
      setRedeemed(await services.collaboration.redeemInvite(code));
      setCode("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "协作码兑换失败");
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <main className="collaboration-page collaboration-redeem-page">
      <AccountPageHeader />
      {loading ? (
        <section className="practice-state-page"><LoaderCircle className="account-spinner" aria-hidden="true" /><h1>正在确认账号…</h1></section>
      ) : !signedIn ? (
        <section className="collaboration-auth-state page-shell">
          <ShieldCheck aria-hidden="true" />
          <p className="eyebrow">COLLABORATION INVITE · 协作邀请</p>
          <h1>请先登录自己的账号</h1>
          <p>协作码必须绑定到接收者本人的账号。登录不会自动获得数据；只有成功兑换后，才会得到学生明确选择的权限。</p>
          <div><Link className="button button--primary" to="/login">登录后兑换</Link><Link className="button button--secondary" to="/register">创建账号</Link></div>
        </section>
      ) : redeemed !== null ? (
        <section className="collaboration-success page-shell">
          <UserRoundCheck aria-hidden="true" />
          <p className="eyebrow">AUTHORITY VERIFIED</p>
          <h1>协作授权已经生效</h1>
          <p>你只能访问学生选择的考试和权限。学生可以随时撤销；所有敏感读取和写入都会留下审计记录。</p>
          <dl>
            <div><dt>身份</dt><dd>{redeemed.subjectKind === "teacher" ? "老师 · Teacher" : "家长 · Parent"}</dd></div>
            <div><dt>考试</dt><dd>{redeemed.examIds.map((exam) => exam.toUpperCase()).join(" · ")}</dd></div>
            <div><dt>权限数</dt><dd>{redeemed.scopes.length} 项</dd></div>
          </dl>
          <Link className="button button--primary" to="/collaboration">进入协作空间<ArrowRight aria-hidden="true" /></Link>
        </section>
      ) : (
        <section className="collaboration-redeem-card page-shell">
          <KeyRound aria-hidden="true" />
          <p className="eyebrow">REDEEM A STUDENT GRANT</p>
          <h1>输入学生发给你的协作码</h1>
          <p>协作码不等于满托资料邀请码。它只用于学生本人的学习数据授权，不解锁付费资料，也不会赋予其他学生的数据权限。</p>
          <label htmlFor="collaboration-code">协作码</label>
          <input id="collaboration-code" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="MTSHARE-…" />
          <button className="button button--primary" type="button" disabled={redeeming} onClick={() => void redeem()}>
            {redeeming ? "正在核验…" : "核验并接受授权"}
          </button>
          {error !== null && <p className="form-error" role="alert">{error}</p>}
          <Link to="/collaboration">查看已有协作空间</Link>
        </section>
      )}
      {!loading && error !== null && !signedIn && <p className="form-error page-shell" role="alert">{error}</p>}
    </main>
  );
}
