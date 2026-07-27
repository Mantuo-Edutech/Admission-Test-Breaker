import { FormEvent, useState } from "react";
import { CheckCircle2, MailCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { funnelExamFromPackageIds } from "../../product-funnel/domain.js";
import {
  hasRegistrationErrors,
  safeInternalReturnPath,
  validateRegistration,
  type RegistrationValidation,
} from "../domain.js";
import { AccountPageHeader } from "../components/AccountPageHeader.js";
import {
  AccountBotChallenge,
  validateBotChallenge,
} from "../components/AccountBotChallenge.js";

interface RegisterPageProps {
  services: AppServices;
}

export function RegisterPage({ services }: RegisterPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [errors, setErrors] = useState<RegistrationValidation>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const account = services.accountAccess;
  const pendingInvite = services.pendingInvite;
  const inviteCode = pendingInvite?.load() ?? null;
  const requestedReturn = safeInternalReturnPath(
    (location.state as { returnTo?: unknown } | null)?.returnTo,
  ) ?? safeInternalReturnPath(pendingInvite?.loadReturnTo());
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
      setSubmitError("Verify an invitation code before creating an account.");
      return;
    }
    const botChallengeError = validateBotChallenge(account.botProtection, captchaToken);
    if (botChallengeError !== undefined) {
      setSubmitError(botChallengeError);
      return;
    }

    setSubmitting(true);
    try {
      const result = await account.register(email, password, captchaToken ?? undefined);
      if (result.status === "confirmation-required") {
        setConfirmationEmail(result.email);
        return;
      }
      const access = await account.redeemInvite(inviteCode);
      const examId = funnelExamFromPackageIds(access.packageIds);
      if (examId !== null) {
        void services.funnel?.track({
          eventType: "invite_redeemed",
          examId,
          contextCode: "register",
        });
      }
      pendingInvite.clear();
      navigate(requestedReturn ?? "/access/complete");
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
      setCaptchaToken(null);
      setCaptchaAttempt((attempt) => attempt + 1);
    }
  }

  if (confirmationEmail !== null) {
    return (
      <main className="account-page">
        <AccountPageHeader />
        <section className="account-message page-shell">
          <MailCheck aria-hidden="true" />
          <p className="eyebrow">ONE MORE STEP</p>
          <h1>Confirm your email<small lang="zh-CN">请确认你的邮箱</small></h1>
          <p>We sent a confirmation email to <strong>{confirmationEmail}</strong>. Open its link to continue.</p>
          {localConfirmationInbox !== null && (
            <p className="account-message__note">
              This is a local preview, so the confirmation email will not reach your real inbox. {" "}
              <a href={localConfirmationInbox} target="_blank" rel="noreferrer">Open local confirmation inbox</a>
              {" "}and open the confirmation link in the latest message.
            </p>
          )}
          <p className="account-message__note">Your invitation code is stored temporarily in this browser. If you confirm on another device, enter the same code again after signing in.</p>
          <Link className="button button--secondary" to="/login" state={requestedReturn === null ? undefined : { returnTo: requestedReturn }}>Confirmed? Sign in</Link>
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
          <p className="eyebrow">VERIFY BEFORE REGISTRATION</p>
          <h1>Enter an invitation code first<small lang="zh-CN">请先输入邀请码</small></h1>
          <p>Create an account after verifying the content access you received.</p>
          <Link className="button button--primary" to="/access">Verify invitation code</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="account-page">
      <AccountPageHeader />
      <section className="account-layout page-shell">
        <div className="account-layout__intro">
          <p className="eyebrow">YOUR LEARNER SPACE</p>
          <h1>Create an account. Keep your complete record.<small lang="zh-CN">创建账号，保存完整训练记录</small></h1>
          <p>Your published content access, practice record and future learning analysis will belong to this account.</p>
          <p className="account-privacy-note">
            Your data is private by default. A teacher or parent can only access specific areas you authorise. <Link to="/privacy">Read the learner privacy notice</Link>
          </p>
        </div>

        <div className="account-card">
          <p className="account-card__step">STEP 2 OF 2</p>
          <h2>Create learner account <small>创建学生账号</small></h2>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="register-email">Email</label>
            <input id="register-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={errors.email !== undefined} aria-describedby={errors.email ? "register-email-error" : undefined} />
            {errors.email && <p className="form-error" id="register-email-error">{errors.email}</p>}

            <label htmlFor="register-password">Password</label>
            <input id="register-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={errors.password !== undefined} aria-describedby={errors.password ? "register-password-error" : "register-password-hint"} />
            {errors.password ? <p className="form-error" id="register-password-error">{errors.password}</p> : <small id="register-password-hint">At least 10 characters with uppercase, lowercase and a number.</small>}

            <label htmlFor="register-password-confirmation">Confirm password</label>
            <input id="register-password-confirmation" type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} aria-invalid={errors.passwordConfirmation !== undefined} aria-describedby={errors.passwordConfirmation ? "register-confirmation-error" : undefined} />
            {errors.passwordConfirmation && <p className="form-error" id="register-confirmation-error">{errors.passwordConfirmation}</p>}

            <AccountBotChallenge
              key={captchaAttempt}
              protection={account?.botProtection ?? { provider: "turnstile", required: false, siteKey: null }}
              action="register"
              onTokenChange={setCaptchaToken}
            />

            {submitError && <p className="form-error" role="alert">{submitError}</p>}
            <button
              className="button button--primary"
              type="submit"
              disabled={submitting || (account?.botProtection.required === true && account.botProtection.siteKey === null)}
            >
              {submitting ? "Creating account…" : "Create account and unlock"}
            </button>
          </form>
          <p className="account-card__alternate">Already have an account? <Link to="/login" state={requestedReturn === null ? undefined : { returnTo: requestedReturn }}>Sign in</Link></p>
        </div>
      </section>
    </main>
  );
}
