import { FormEvent, useState } from "react";
import { CheckCircle2, MailCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import {
  hasRegistrationErrors,
  validateRegistration,
  type RegistrationValidation,
} from "../domain.js";
import { AccountPageHeader } from "../components/AccountPageHeader.js";

interface RegisterPageProps {
  services: AppServices;
}

export function RegisterPage({ services }: RegisterPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [errors, setErrors] = useState<RegistrationValidation>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const account = services.accountAccess;
  const pendingInvite = services.pendingInvite;
  const inviteCode = pendingInvite?.load() ?? null;
  const localConfirmationInbox =
    import.meta.env.DEV && /^(?:localhost|127\.0\.0\.1)$/u.test(globalThis.location.hostname)
      ? "http://127.0.0.1:54324"
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateRegistration({ email, password, passwordConfirmation });
    setErrors(validation);
    setSubmitError(null);
    if (hasRegistrationErrors(validation)) return;
    if (account?.configured !== true || pendingInvite === undefined || inviteCode === null) {
      setSubmitError("请先验证邀请码，再创建账号");
      return;
    }

    setSubmitting(true);
    try {
      const result = await account.register(email, password);
      if (result.status === "confirmation-required") {
        setConfirmationEmail(result.email);
        return;
      }
      await account.redeemInvite(inviteCode);
      pendingInvite.clear();
      navigate("/access/complete");
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : "注册失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmationEmail !== null) {
    return (
      <main className="account-page">
        <AccountPageHeader />
        <section className="account-message page-shell">
          <MailCheck aria-hidden="true" />
          <p className="eyebrow">还差一步</p>
          <h1>请确认你的邮箱</h1>
          <p>确认邮件已发送至 <strong>{confirmationEmail}</strong>。点击邮件中的链接后，系统会自动解锁邀请码对应的内容。</p>
          {localConfirmationInbox !== null && (
            <p className="account-message__note">
              当前是本地预览，确认邮件不会进入你的真实邮箱。
              <a href={localConfirmationInbox} target="_blank" rel="noreferrer">打开本地确认邮箱</a>
              ，再点击最新邮件中的确认链接。
            </p>
          )}
          <p className="account-message__note">邀请码已暂存在当前浏览器中，请尽量使用同一设备完成确认。</p>
          <Link className="button button--secondary" to="/login">已经确认？前往登录</Link>
        </section>
      </main>
    );
  }

  if (inviteCode === null) {
    return (
      <main className="account-page">
        <AccountPageHeader />
        <section className="account-message page-shell">
          <CheckCircle2 aria-hidden="true" />
          <p className="eyebrow">注册前验证</p>
          <h1>请先输入邀请码</h1>
          <p>注册只面向已经获得内容权限的学生。先验证邀请码，再创建账号。</p>
          <Link className="button button--primary" to="/access">验证邀请码</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="account-page">
      <AccountPageHeader />
      <section className="account-layout page-shell">
        <div className="account-layout__intro">
          <p className="eyebrow">建立你的学习空间</p>
          <h1>创建账号，保存完整训练记录</h1>
          <p>注册完成后，你的模考权限、作答记录和未来的学习分析都会归属于这个账号。</p>
          <p className="account-privacy-note">
            数据默认仅本人可见。以后如需老师或家长查看，必须由学生逐项授权。
          </p>
        </div>

        <div className="account-card">
          <p className="account-card__step">步骤 2 / 2</p>
          <h2>创建学生账号</h2>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="register-email">邮箱</label>
            <input id="register-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={errors.email !== undefined} aria-describedby={errors.email ? "register-email-error" : undefined} />
            {errors.email && <p className="form-error" id="register-email-error">{errors.email}</p>}

            <label htmlFor="register-password">密码</label>
            <input id="register-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={errors.password !== undefined} aria-describedby={errors.password ? "register-password-error" : "register-password-hint"} />
            {errors.password ? <p className="form-error" id="register-password-error">{errors.password}</p> : <small id="register-password-hint">至少 10 位，包含大写字母、小写字母和数字。</small>}

            <label htmlFor="register-password-confirmation">再次输入密码</label>
            <input id="register-password-confirmation" type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} aria-invalid={errors.passwordConfirmation !== undefined} aria-describedby={errors.passwordConfirmation ? "register-confirmation-error" : undefined} />
            {errors.passwordConfirmation && <p className="form-error" id="register-confirmation-error">{errors.passwordConfirmation}</p>}

            {submitError && <p className="form-error" role="alert">{submitError}</p>}
            <button className="button button--primary" type="submit" disabled={submitting}>
              {submitting ? "正在创建账号…" : "创建账号并解锁"}
            </button>
          </form>
          <p className="account-card__alternate">已有账号？ <Link to="/login">直接登录</Link></p>
        </div>
      </section>
    </main>
  );
}
