import { Turnstile } from "@marsidev/react-turnstile";
import type { AccountBotProtection } from "../domain.js";

interface AccountBotChallengeProps {
  readonly protection: AccountBotProtection;
  readonly action: "register" | "login" | "password-reset";
  readonly onTokenChange: (token: string | null) => void;
}

export function AccountBotChallenge({
  protection,
  action,
  onTokenChange,
}: AccountBotChallengeProps) {
  if (protection.siteKey === null) {
    return protection.required ? (
      <p className="form-error" role="alert">
        账号安全验证尚未配置，当前暂不能提交。请联系满托。
      </p>
    ) : null;
  }

  return (
    <div className="account-bot-challenge">
      <p className="account-bot-challenge__label">安全验证</p>
      <Turnstile
        siteKey={protection.siteKey}
        onSuccess={(token) => onTokenChange(token)}
        onExpire={() => onTokenChange(null)}
        onError={() => {
          onTokenChange(null);
        }}
        onTimeout={() => onTokenChange(null)}
        onUnsupported={() => onTokenChange(null)}
        options={{
          action,
          appearance: "interaction-only",
          language: "zh-CN",
          refreshExpired: "auto",
          refreshTimeout: "auto",
          size: "flexible",
          theme: "light",
        }}
        scriptOptions={{ crossOrigin: "anonymous" }}
      />
      <small>由 Cloudflare Turnstile 提供防机器人验证。</small>
    </div>
  );
}

export function validateBotChallenge(
  protection: AccountBotProtection,
  token: string | null,
): string | undefined {
  if (protection.required && protection.siteKey === null) {
    return "账号安全验证尚未配置，当前暂不能提交。请联系满托。";
  }
  if (protection.required && token === null) {
    return "请先完成安全验证";
  }
  return undefined;
}
