import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { validatePassword } from "../domain.js";
import { AccountPageHeader } from "../components/AccountPageHeader.js";

type RecoveryState = "checking" | "ready" | "invalid";

export function PasswordResetPage({ services }: { readonly services: AppServices }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<RecoveryState>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const code = searchParams.get("code");
    const account = services.accountAccess;
    if (code === null || code.trim() === "" || account?.configured !== true) {
      setState("invalid");
      return () => { active = false; };
    }
    void account.completePasswordRecovery(code)
      .then(() => { if (active) setState("ready"); })
      .catch(() => { if (active) setState("invalid"); });
    return () => { active = false; };
  }, [searchParams, services.accountAccess]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const passwordError = validatePassword(password);
    if (passwordError !== undefined) {
      setError(passwordError);
      return;
    }
    if (password !== confirmation) {
      setError("两次输入的密码不一致");
      return;
    }
    const account = services.accountAccess;
    if (account?.configured !== true) return;
    setSubmitting(true);
    setError(null);
    try {
      await account.updatePassword(password);
      navigate("/account");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "暂时无法更新密码");
      setSubmitting(false);
    }
  }

  return (
    <main className="account-page">
      <AccountPageHeader />
      {state === "checking" && (
        <section className="account-message page-shell"><LoaderCircle className="account-spinner" aria-hidden="true" /><h1>正在验证重置链接…</h1></section>
      )}
      {state === "invalid" && (
        <section className="account-message page-shell">
          <TriangleAlert aria-hidden="true" />
          <p className="eyebrow">密码重置</p>
          <h1>链接无效或已经过期</h1>
          <p>重新申请一封重置邮件，再使用最新邮件中的链接。</p>
          <Link className="button button--primary" to="/forgot-password">重新申请</Link>
        </section>
      )}
      {state === "ready" && (
        <section className="account-layout account-layout--login page-shell">
          <div className="account-layout__intro">
            <CheckCircle2 aria-hidden="true" />
            <p className="eyebrow">链接已验证</p>
            <h1>设置新密码</h1>
            <p>新密码保存后，当前设备会进入你的账号页面。</p>
          </div>
          <div className="account-card">
            <h2>新密码</h2>
            <form onSubmit={submit} noValidate>
              <label htmlFor="new-password">新密码</label>
              <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <small>至少 10 位，包含大写字母、小写字母和数字。</small>
              <label htmlFor="new-password-confirmation">再次输入新密码</label>
              <input id="new-password-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? "正在保存…" : "保存新密码"}</button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
