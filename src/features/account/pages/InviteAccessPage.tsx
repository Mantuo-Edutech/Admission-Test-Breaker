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
      setError("请输入完整的邀请码");
      return;
    }
    if (!available) {
      setError("账号服务尚未连接，请稍后再试");
      return;
    }

    setChecking(true);
    try {
      const normalized = normalizeInviteCode(code);
      const preview = await account.previewInvite(normalized);
      if (!preview.valid) {
        setError("邀请码无效、已过期或已被使用");
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
      setError(reason instanceof Error ? reason.message : "邀请码验证失败，请稍后再试");
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="account-page">
      <AccountPageHeader />
      <section className="account-layout page-shell">
        <div className="account-layout__intro">
          <p className="eyebrow">内容权限</p>
          <h1>使用邀请码解锁已发布内容</h1>
          <p>
            输入冰冰提供的邀请码。已登录会直接解锁；未登录则在创建或登录账号后，把邀请码中列明的已发布资料绑定到本人账号。
          </p>
          <ul className="account-assurances" aria-label="邀请码说明">
            <li><KeyRound aria-hidden="true" /><span>一个账号保存一份长期练习记录</span></li>
            <li><ShieldCheck aria-hidden="true" /><span>邀请码只解锁内容，不开放你的学习数据</span></li>
            <li><LockKeyhole aria-hidden="true" /><span>学习数据默认只有学生本人可以访问</span></li>
          </ul>
        </div>

        <div className="account-card">
          <p className="account-card__step">内容权限验证</p>
          <h2>验证邀请码</h2>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="invite-code">邀请码</label>
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
              placeholder="例如 MANTUO-XXXX-…"
            />
            {error === null ? (
              <small id="invite-code-hint">短横线和空格不会影响验证。</small>
            ) : (
              <p className="form-error" id="invite-code-error" role="alert">{error}</p>
            )}
            <button className="button button--primary" type="submit" disabled={checking}>
              {checking ? "正在验证…" : "验证并继续"}
            </button>
          </form>
          <p className="account-card__alternate">
            已经注册？ <Link to="/login" state={returnTo === null ? undefined : { returnTo }}>登录并解锁</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
