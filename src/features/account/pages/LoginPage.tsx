import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { funnelExamFromPackageIds } from "../../product-funnel/domain.js";
import { AccountPageHeader } from "../components/AccountPageHeader.js";
import { safeInternalReturnPath } from "../domain.js";
import {
  AccountBotChallenge,
  validateBotChallenge,
} from "../components/AccountBotChallenge.js";

interface LoginPageProps {
  services: AppServices;
}

export function LoginPage({ services }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaAttempt, setCaptchaAttempt] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const account = services.accountAccess;
    if (account?.configured !== true) {
      setError("账号服务尚未连接，请稍后再试");
      return;
    }
    if (email.trim().length === 0 || password.length === 0) {
      setError("请输入邮箱和密码");
      return;
    }
    const botChallengeError = validateBotChallenge(account.botProtection, captchaToken);
    if (botChallengeError !== undefined) {
      setError(botChallengeError);
      return;
    }

    setSubmitting(true);
    try {
      await account.signIn(email, password, captchaToken ?? undefined);
      const inviteCode = services.pendingInvite?.load() ?? null;
      if (inviteCode !== null) {
        const pendingReturn = safeInternalReturnPath(services.pendingInvite?.loadReturnTo());
        const access = await account.redeemInvite(inviteCode);
        const examId = funnelExamFromPackageIds(access.packageIds);
        if (examId !== null) {
          void services.funnel?.track({
            eventType: "invite_redeemed",
            examId,
            contextCode: "login",
          });
        }
        services.pendingInvite?.clear();
        navigate(pendingReturn ?? "/access/complete");
      } else {
        const requestedReturn = (location.state as { returnTo?: unknown } | null)?.returnTo;
        const safeReturn = safeInternalReturnPath(requestedReturn) ?? "/exams/tmua/coverage";
        navigate(safeReturn);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败，请稍后再试");
    } finally {
      setSubmitting(false);
      setCaptchaToken(null);
      setCaptchaAttempt((attempt) => attempt + 1);
    }
  }

  return (
    <main className="account-page">
      <AccountPageHeader />
      <section className="account-layout account-layout--login page-shell">
        <div className="account-layout__intro">
          <p className="eyebrow">学生账号</p>
          <h1>继续你的训练</h1>
          <p>登录后继续使用已解锁的复习资料与逐题解析。当前浏览器中如有待核销的邀请码，也会自动完成解锁。</p>
        </div>
        <div className="account-card">
          <h2>登录</h2>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="login-email">邮箱</label>
            <input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <label htmlFor="login-password">密码</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <AccountBotChallenge
              key={captchaAttempt}
              protection={services.accountAccess?.botProtection ?? { provider: "turnstile", required: false, siteKey: null }}
              action="login"
              onTokenChange={setCaptchaToken}
            />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button
              className="button button--primary"
              type="submit"
              disabled={submitting || (services.accountAccess?.botProtection.required === true && services.accountAccess.botProtection.siteKey === null)}
            >{submitting ? "正在登录…" : "登录"}</button>
          </form>
          <p className="account-card__recovery"><Link to="/forgot-password">忘记密码？</Link></p>
          <p className="account-card__alternate">还没有账号？ <Link to="/access">先验证邀请码</Link></p>
        </div>
      </section>
    </main>
  );
}
