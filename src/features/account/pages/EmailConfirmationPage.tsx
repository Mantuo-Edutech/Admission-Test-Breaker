import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { funnelExamFromPackageIds } from "../../product-funnel/domain.js";
import { AccountPageHeader } from "../components/AccountPageHeader.js";
import { safeInternalReturnPath } from "../domain.js";

interface EmailConfirmationPageProps {
  services: AppServices;
}

type ConfirmationState = "working" | "confirmed" | "unlocked" | "error";

export function EmailConfirmationPage({ services }: EmailConfirmationPageProps) {
  const [searchParams] = useSearchParams();
  const confirmationCode = searchParams.get("code");
  const [state, setState] = useState<ConfirmationState>("working");
  const [message, setMessage] = useState("Confirming your email and content access…");
  const [returnTo, setReturnTo] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function confirm() {
      const account = services.accountAccess;
      if (confirmationCode === null || account?.configured !== true) {
        if (active) {
          setState("error");
          setMessage("The confirmation link is invalid or account service is unavailable.");
        }
        return;
      }
      try {
        await account.completeEmailConfirmation(confirmationCode);
        const inviteCode = services.pendingInvite?.load() ?? null;
        if (inviteCode !== null) {
          const pendingReturn = safeInternalReturnPath(services.pendingInvite?.loadReturnTo());
          const access = await account.redeemInvite(inviteCode);
          const examId = funnelExamFromPackageIds(access.packageIds);
          if (examId !== null) {
            void services.funnel?.track({
              eventType: "invite_redeemed",
              examId,
              contextCode: "email-confirmation",
            });
          }
          services.pendingInvite?.clear();
          if (active) setReturnTo(pendingReturn);
          if (active) {
            setState("unlocked");
            setMessage("Email confirmed. Content access is now linked to your account.");
          }
          return;
        }
        if (active) {
          setState("confirmed");
          setMessage("Email confirmed. No pending invitation was found in this browser; enter the original code again to link the content.");
        }
      } catch (reason) {
        if (active) {
          setState("error");
          setMessage(reason instanceof Error ? reason.message : "Email confirmation failed. Please sign in again.");
        }
      }
    }
    void confirm();
    return () => { active = false; };
  }, [confirmationCode, services]);

  const complete = state === "confirmed" || state === "unlocked";

  return (
    <main className="account-page">
      <AccountPageHeader />
      <section className="account-message page-shell" aria-live="polite">
        {state === "working" && <LoaderCircle className="account-spinner" aria-hidden="true" />}
        {complete && <CheckCircle2 aria-hidden="true" />}
        {state === "error" && <TriangleAlert aria-hidden="true" />}
        <p className="eyebrow">EMAIL CONFIRMATION</p>
        <h1>{state === "unlocked" ? "Access unlocked" : state === "confirmed" ? "Email confirmed" : state === "error" ? "Confirmation failed" : "Finishing account setup…"}</h1>
        <p>{message}</p>
        {state !== "working" && (
          <Link className="button button--primary" to={state === "unlocked" ? returnTo ?? "/access/complete" : state === "confirmed" ? "/access" : "/login"}>
            {state === "unlocked" ? "Open unlocked content" : state === "confirmed" ? "Enter invitation code again" : "Back to sign in"}
          </Link>
        )}
      </section>
    </main>
  );
}
