import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { AccountPageHeader } from "../components/AccountPageHeader.js";

interface EmailConfirmationPageProps {
  services: AppServices;
}

type ConfirmationState = "working" | "complete" | "error";

export function EmailConfirmationPage({ services }: EmailConfirmationPageProps) {
  const [state, setState] = useState<ConfirmationState>("working");
  const [message, setMessage] = useState("正在确认邮箱并解锁内容…");

  useEffect(() => {
    let active = true;
    async function confirm() {
      const code = new URLSearchParams(globalThis.location.search).get("code");
      const account = services.accountAccess;
      if (code === null || account?.configured !== true) {
        if (active) {
          setState("error");
          setMessage("确认链接无效或账号服务尚未连接");
        }
        return;
      }
      try {
        await account.completeEmailConfirmation(code);
        const inviteCode = services.pendingInvite?.load() ?? null;
        if (inviteCode !== null) {
          await account.redeemInvite(inviteCode);
          services.pendingInvite?.clear();
        }
        if (active) {
          setState("complete");
          setMessage("邮箱确认完成，内容权限已经绑定到你的账号。");
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
  }, [services]);

  return (
    <main className="account-page">
      <AccountPageHeader />
      <section className="account-message page-shell" aria-live="polite">
        {state === "working" && <LoaderCircle className="account-spinner" aria-hidden="true" />}
        {state === "complete" && <CheckCircle2 aria-hidden="true" />}
        {state === "error" && <TriangleAlert aria-hidden="true" />}
        <p className="eyebrow">邮箱确认</p>
        <h1>{state === "complete" ? "解锁完成" : state === "error" ? "未能完成确认" : "正在完成账号设置"}</h1>
        <p>{message}</p>
        {state !== "working" && (
          <Link className="button button--primary" to={state === "complete" ? "/exams/tmua/resources" : "/login"}>
            {state === "complete" ? "查看已解锁内容" : "返回登录"}
          </Link>
        )}
      </section>
    </main>
  );
}
