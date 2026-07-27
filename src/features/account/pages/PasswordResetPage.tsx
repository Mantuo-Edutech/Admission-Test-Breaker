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
      setError("The passwords do not match");
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
      setError(reason instanceof Error ? reason.message : "Password could not be updated");
      setSubmitting(false);
    }
  }

  return (
    <main className="account-page">
      <AccountPageHeader />
      {state === "checking" && (
        <section className="account-message page-shell"><LoaderCircle className="account-spinner" aria-hidden="true" /><h1>Checking reset link…<small lang="zh-CN">正在验证重置链接</small></h1></section>
      )}
      {state === "invalid" && (
        <section className="account-message page-shell">
          <TriangleAlert aria-hidden="true" />
          <p className="eyebrow">PASSWORD RESET</p>
          <h1>Link invalid or expired<small lang="zh-CN">链接无效或已经过期</small></h1>
          <p>Request a new reset email and use the latest link.</p>
          <Link className="button button--primary" to="/forgot-password">Request again</Link>
        </section>
      )}
      {state === "ready" && (
        <section className="account-layout account-layout--login page-shell">
          <div className="account-layout__intro">
            <CheckCircle2 aria-hidden="true" />
            <p className="eyebrow">LINK VERIFIED</p>
            <h1>Set a new password<small lang="zh-CN">设置新密码</small></h1>
            <p>After saving, this device opens your account page.</p>
          </div>
          <div className="account-card">
            <h2>New password<small lang="zh-CN">新密码</small></h2>
            <form onSubmit={submit} noValidate>
              <label htmlFor="new-password">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <small>At least 10 characters with uppercase, lowercase and a number.</small>
              <label htmlFor="new-password-confirmation">Confirm new password</label>
              <input id="new-password-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save new password"}</button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
