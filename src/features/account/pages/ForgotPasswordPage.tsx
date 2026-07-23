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
      setError("请输入有效的邮箱地址");
      return;
    }
    const account = services.accountAccess;
    if (account?.configured !== true) {
      setError("账号服务尚未连接，请稍后再试");
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
      setError(reason instanceof Error ? reason.message : "暂时无法发送重置邮件");
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
          <p className="eyebrow">密码重置</p>
          <h1>检查你的邮箱</h1>
          <p>如果这个邮箱已注册，系统会发送一封密码重置邮件。为保护账号隐私，这里不会确认邮箱是否存在。</p>
          <Link className="button button--secondary" to="/login">返回登录</Link>
        </section>
      ) : (
        <section className="account-layout account-layout--login page-shell">
          <div className="account-layout__intro">
            <p className="eyebrow">密码重置</p>
            <h1>找回你的账号</h1>
            <p>输入注册邮箱。收到邮件后，从同一设备打开链接并设置新密码。</p>
          </div>
          <div className="account-card">
            <h2>发送重置邮件</h2>
            <form onSubmit={submit} noValidate>
              <label htmlFor="recovery-email">邮箱</label>
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
              >{submitting ? "正在发送…" : "发送重置邮件"}</button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
