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
        Account security verification is not configured, so this form cannot be submitted. Please contact Mantou.
      </p>
    ) : null;
  }

  return (
    <div className="account-bot-challenge">
      <p className="account-bot-challenge__label">Security check <small lang="zh-CN">安全验证</small></p>
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
          language: "en",
          refreshExpired: "auto",
          refreshTimeout: "auto",
          size: "flexible",
          theme: "light",
        }}
        scriptOptions={{ crossOrigin: "anonymous" }}
      />
      <small>Bot protection by Cloudflare Turnstile.</small>
    </div>
  );
}

export function validateBotChallenge(
  protection: AccountBotProtection,
  token: string | null,
): string | undefined {
  if (protection.required && protection.siteKey === null) {
    return "Account security verification is not configured. Please contact Mantou.";
  }
  if (protection.required && token === null) {
    return "Complete the security check first.";
  }
  return undefined;
}
