import { FormEvent, useState } from "react";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { funnelExamFromPackageIds } from "../../product-funnel/domain.js";
import {
  inviteCodeLooksValid,
  normalizeInviteCode,
  safeInternalReturnPath,
} from "../domain.js";
import { AccountPageHeader } from "../components/AccountPageHeader.js";

interface InviteAccessPageProps {
  services: AppServices;
}

export function InviteAccessPage({ services }: InviteAccessPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const account = services.accountAccess;
  const pendingInvite = services.pendingInvite;
  const available = account?.configured === true && pendingInvite !== undefined;
  const returnTo = safeInternalReturnPath(searchParams.get("returnTo"));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!inviteCodeLooksValid(code)) {
      setError("Enter the complete invitation code.");
      return;
    }
    if (!available) {
      setError("The account service is not connected. Please try again later.");
      return;
    }

    setChecking(true);
    try {
      const normalized = normalizeInviteCode(code);
      const preview = await account.previewInvite(normalized);
      if (!preview.valid) {
        setError("This invitation code is invalid, expired or already used.");
        return;
      }
      const accessState = await account.getAccessState();
      if (accessState.session !== null) {
        const access = await account.redeemInvite(normalized);
        const examId = funnelExamFromPackageIds(access.packageIds);
        if (examId !== null) {
          void services.funnel?.track({
            eventType: "invite_redeemed",
            examId,
            contextCode: "signed-in-access",
          });
        }
        pendingInvite.clear();
        navigate(returnTo ?? "/access/complete");
        return;
      }
      pendingInvite.save(normalized);
      if (returnTo !== null) pendingInvite.saveReturnTo(returnTo);
      navigate("/register", { state: returnTo === null ? null : { returnTo } });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The invitation code could not be verified. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="account-page">
      <AccountPageHeader />
      <section className="account-layout page-shell">
        <div className="account-layout__intro">
          <p className="eyebrow">CONTENT ACCESS</p>
          <h1>Unlock published content<small lang="zh-CN">使用邀请码解锁内容</small></h1>
          <p>Enter the invitation code provided by Bingbing. The released content will be linked to your learner account.</p>
          <ul className="account-assurances" aria-label="Invitation code details">
            <li><KeyRound aria-hidden="true" /><span>One account keeps one continuous learning record</span></li>
            <li><ShieldCheck aria-hidden="true" /><span>A code unlocks content, not access to your learning data</span></li>
            <li><LockKeyhole aria-hidden="true" /><span>Your learning data is private by default</span></li>
          </ul>
        </div>

        <div className="account-card">
          <p className="account-card__step">CONTENT ACCESS</p>
          <h2>Verify invitation code <small>验证邀请码</small></h2>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="invite-code">Invitation code</label>
            <input
              id="invite-code"
              name="invite-code"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              aria-describedby={error === null ? "invite-code-hint" : "invite-code-error"}
              aria-invalid={error !== null}
              placeholder="For example, MANTUO-XXXX-…"
            />
            {error === null ? (
              <small id="invite-code-hint">Hyphens and spaces do not affect verification.</small>
            ) : (
              <p className="form-error" id="invite-code-error" role="alert">{error}</p>
            )}
            <button className="button button--primary" type="submit" disabled={checking}>
              {checking ? "Checking…" : "Verify and continue"}
            </button>
          </form>
          <p className="account-card__alternate">
            Already registered? <Link to="/login" state={returnTo === null ? undefined : { returnTo }}>Sign in and unlock</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
