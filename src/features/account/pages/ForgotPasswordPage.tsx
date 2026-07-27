import { FormEvent, useState } from "react";
import { MailCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { AccountPageHeader } from "../components/AccountPageHeader.js";
import {
  AccountBotChallenge,
  validateBotChallenge,
} from "../components/AccountBotChallenge.js";

export function ForgotPasswordPage({ services }: { readonly services: AppServices }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaAttempt, setCaptchaAttempt] = useState(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    const account = services.accountAccess;
    if (account?.configured !== true) {
      setError("Account service is unavailable. Please try again.");
      return;
    }
    const botChallengeError = validateBotChallenge(account.botProtection, captchaToken);
    if (botChallengeError !== undefined) {
      setError(botChallengeError);
      return;
    }
    setSubmitting(true);
    try {
      await account.requestPasswordReset(email, captchaToken ?? undefined);
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Reset email could not be sent");
    } finally {
      setSubmitting(false);
      setCaptchaToken(null);
      setCaptchaAttempt((attempt) => attempt + 1);
    }
  }

  return (
    <main className="account-page">
      <AccountPageHeader />
      {sent ? (
        <section className="account-message page-shell">
          <MailCheck aria-hidden="true" />
          <p className="eyebrow">PASSWORD RESET</p>
          <h1>Check your email<small lang="zh-CN">检查你的邮箱</small></h1>
          <p>If the address is registered, a password reset email will arrive. We do not confirm whether an account exists.</p>
          <Link className="button button--secondary" to="/login">Back to sign in</Link>
        </section>
      ) : (
        <section className="account-layout account-layout--login page-shell">
          <div className="account-layout__intro">
            <p className="eyebrow">PASSWORD RESET</p>
            <h1>Recover your account<small lang="zh-CN">找回你的账号</small></h1>
            <p>Enter your registered email, then open the reset link on this device.</p>
          </div>
          <div className="account-card">
            <h2>Send reset email<small lang="zh-CN">发送重置邮件</small></h2>
            <form onSubmit={submit} noValidate>
              <label htmlFor="recovery-email">Email</label>
              <input id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              <AccountBotChallenge
                key={captchaAttempt}
                protection={services.accountAccess?.botProtection ?? { provider: "turnstile", required: false, siteKey: null }}
                action="password-reset"
                onTokenChange={setCaptchaToken}
              />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button
                className="button button--primary"
                type="submit"
                disabled={submitting || (services.accountAccess?.botProtection.required === true && services.accountAccess.botProtection.siteKey === null)}
              >{submitting ? "Sending…" : "Send reset email"}</button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
