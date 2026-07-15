import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { AccountPageHeader } from "../components/AccountPageHeader.js";

interface LoginPageProps {
  services: AppServices;
}

export function LoginPage({ services }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    setSubmitting(true);
    try {
      await account.signIn(email, password);
      const inviteCode = services.pendingInvite?.load() ?? null;
      if (inviteCode !== null) {
        await account.redeemInvite(inviteCode);
        services.pendingInvite?.clear();
        navigate("/access/complete");
      } else {
        navigate("/exams/tmua/dashboard");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="account-page">
      <AccountPageHeader />
      <section className="account-layout account-layout--login page-shell">
        <div className="account-layout__intro">
          <p className="eyebrow">学生账号</p>
          <h1>继续你的训练</h1>
          <p>登录后继续使用已解锁的模考与复习资料。当前浏览器中如有待核销的邀请码，也会自动完成解锁。</p>
        </div>
        <div className="account-card">
          <h2>登录</h2>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="login-email">邮箱</label>
            <input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <label htmlFor="login-password">密码</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? "正在登录…" : "登录"}</button>
          </form>
          <p className="account-card__alternate">还没有账号？ <Link to="/access">先验证邀请码</Link></p>
        </div>
      </section>
    </main>
  );
}
