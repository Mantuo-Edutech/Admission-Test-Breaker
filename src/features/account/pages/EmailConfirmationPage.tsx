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
  const [message, setMessage] = useState("正在确认邮箱并解锁内容…");
  const [returnTo, setReturnTo] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function confirm() {
      const account = services.accountAccess;
      if (confirmationCode === null || account?.configured !== true) {
        if (active) {
          setState("error");
          setMessage("确认链接无效或账号服务尚未连接");
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
            setMessage("邮箱确认完成，内容权限已经绑定到你的账号。");
          }
          return;
        }
        if (active) {
          setState("confirmed");
          setMessage("邮箱已确认。当前浏览器没有待核销的邀请码，请重新输入冰冰提供的原邀请码完成资料绑定。");
        }
      } catch (reason) {
        if (active) {
          setState("error");
          setMessage(reason instanceof Error ? reason.message : "邮箱确认失败，请重新登录");
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
        <p className="eyebrow">邮箱确认</p>
        <h1>{state === "unlocked" ? "解锁完成" : state === "confirmed" ? "邮箱已确认" : state === "error" ? "未能完成确认" : "正在完成账号设置"}</h1>
        <p>{message}</p>
        {state !== "working" && (
          <Link className="button button--primary" to={state === "unlocked" ? returnTo ?? "/access/complete" : state === "confirmed" ? "/access" : "/login"}>
            {state === "unlocked" ? "查看已解锁内容" : state === "confirmed" ? "重新输入邀请码" : "返回登录"}
          </Link>
        )}
      </section>
    </main>
  );
}
