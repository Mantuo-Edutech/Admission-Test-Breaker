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
      setError("The account service is not connected. Please try again later.");
      return;
    }
    if (email.trim().length === 0 || password.length === 0) {
      setError("Enter your email and password.");
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
      setError(reason instanceof Error ? reason.message : "Sign-in failed. Please try again.");
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
          <p className="eyebrow">LEARNER ACCOUNT</p>
          <h1>Continue your preparation<small lang="zh-CN">继续你的训练</small></h1>
          <p>Sign in to continue your saved practice, review notes and unlocked explanations.</p>
        </div>
        <div className="account-card">
          <h2>Sign in <small>登录</small></h2>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <label htmlFor="login-password">Password</label>
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
            >{submitting ? "Signing in…" : "Sign in"}</button>
          </form>
          <p className="account-card__recovery"><Link to="/forgot-password">Forgot your password?</Link></p>
          <p className="account-card__alternate">No account yet? <Link to="/access">Verify an invitation code</Link></p>
        </div>
      </section>
    </main>
  );
}
