import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AccountAccessService,
  AccountAccessState,
  AccountSession,
  AccountBotProtection,
  InvitePreview,
  RedeemedAccess,
  RegistrationResult,
} from "./domain.js";

interface InvitePreviewResponse {
  valid?: unknown;
  label?: unknown;
  packages?: unknown;
}

interface EntitlementRow {
  package_id: string;
  expires_at: string | null;
  revoked_at?: string | null;
}

export interface SupabaseBrowserConfiguration {
  url?: string;
  publishableKey?: string;
}

const DISABLED_BOT_PROTECTION: AccountBotProtection = {
  provider: "turnstile",
  required: false,
  siteKey: null,
};

export function createSupabaseBrowserClient(
  configuration: SupabaseBrowserConfiguration,
): SupabaseClient | null {
  const url = configuration.url?.trim();
  const publishableKey = configuration.publishableKey?.trim();
  if (!url || !publishableKey) return null;

  return createClient(url, publishableKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

function accountSession(email: string | undefined): AccountSession {
  if (email === undefined || email.length === 0) {
    throw new Error("账号邮箱不可用，请重新登录");
  }
  return { email };
}

export function readableAuthError(message: string): Error {
  if (/invalid login credentials/i.test(message)) {
    return new Error("邮箱或密码不正确");
  }
  if (/email not confirmed/i.test(message)) {
    return new Error("邮箱尚未确认。请先点击确认邮件中的链接，再重新登录");
  }
  if (/user already registered/i.test(message)) {
    return new Error("这个邮箱已经注册，请直接登录");
  }
  if (/password/i.test(message)) {
    return new Error("密码未达到安全要求");
  }
  if (/email rate limit/i.test(message)) {
    return new Error("确认邮件发送过于频繁，请稍后再试");
  }
  if (/captcha/i.test(message)) {
    return new Error("安全验证无效或已经过期，请重新完成验证");
  }
  if (/rate limit|too many requests/i.test(message)) {
    return new Error("操作过于频繁，请稍后再试");
  }
  return new Error("账号服务暂时不可用，请稍后再试");
}

class UnavailableAccountAccessService implements AccountAccessService {
  readonly configured = false;
  readonly botProtection = DISABLED_BOT_PROTECTION;

  private unavailable(): never {
    throw new Error("账号服务尚未连接，请稍后再试");
  }

  async previewInvite(): Promise<InvitePreview> { return this.unavailable(); }
  async register(): Promise<RegistrationResult> { return this.unavailable(); }
  async signIn(): Promise<AccountSession> { return this.unavailable(); }
  async completeEmailConfirmation(): Promise<AccountSession> { return this.unavailable(); }
  async requestPasswordReset(): Promise<void> { return this.unavailable(); }
  async completePasswordRecovery(): Promise<AccountSession> { return this.unavailable(); }
  async updatePassword(): Promise<void> { return this.unavailable(); }
  async signOut(): Promise<void> { return this.unavailable(); }
  async redeemInvite(): Promise<RedeemedAccess> { return this.unavailable(); }
  async getAccessState(): Promise<AccountAccessState> { return this.unavailable(); }
}

export class SupabaseAccountAccessService implements AccountAccessService {
  readonly configured = true;

  constructor(
    private readonly client: SupabaseClient,
    private readonly confirmationRedirectUrl: string,
    private readonly passwordResetRedirectUrl: string,
    readonly botProtection: AccountBotProtection = DISABLED_BOT_PROTECTION,
  ) {}

  private captchaToken(token: string | undefined): string | undefined {
    const cleanedToken = token?.trim();
    if (this.botProtection.required && !cleanedToken) {
      throw new Error("请先完成安全验证");
    }
    return cleanedToken || undefined;
  }

  async previewInvite(code: string): Promise<InvitePreview> {
    const { data, error } = await this.client.functions.invoke("invite-preview", {
      body: { code },
    });
    if (error !== null) {
      throw new Error("邀请码验证暂时不可用，请稍后再试");
    }

    const response = data as InvitePreviewResponse | null;
    return {
      valid: response?.valid === true,
      label: typeof response?.label === "string" ? response.label : null,
      packages: Array.isArray(response?.packages)
        ? response.packages.filter((item): item is string => typeof item === "string")
        : [],
    };
  }

  async register(
    email: string,
    password: string,
    captchaToken?: string,
  ): Promise<RegistrationResult> {
    const verifiedCaptchaToken = this.captchaToken(captchaToken);
    const { data, error } = await this.client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: this.confirmationRedirectUrl,
        ...(verifiedCaptchaToken === undefined ? {} : { captchaToken: verifiedCaptchaToken }),
      },
    });
    if (error !== null) throw readableAuthError(error.message);
    if (data.session !== null) {
      return { status: "signed-in", session: accountSession(data.user?.email) };
    }
    return { status: "confirmation-required", email: email.trim() };
  }

  async signIn(
    email: string,
    password: string,
    captchaToken?: string,
  ): Promise<AccountSession> {
    const verifiedCaptchaToken = this.captchaToken(captchaToken);
    const { data, error } = await this.client.auth.signInWithPassword({
      email: email.trim(),
      password,
      ...(verifiedCaptchaToken === undefined
        ? {}
        : { options: { captchaToken: verifiedCaptchaToken } }),
    });
    if (error !== null) throw readableAuthError(error.message);
    return accountSession(data.user.email);
  }

  async completeEmailConfirmation(code: string): Promise<AccountSession> {
    const { data, error } = await this.client.auth.exchangeCodeForSession(code);
    if (error !== null) throw readableAuthError(error.message);
    return accountSession(data.user.email);
  }

  async requestPasswordReset(email: string, captchaToken?: string): Promise<void> {
    const verifiedCaptchaToken = this.captchaToken(captchaToken);
    const { error } = await this.client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: this.passwordResetRedirectUrl,
      ...(verifiedCaptchaToken === undefined
        ? {}
        : { captchaToken: verifiedCaptchaToken }),
    });
    if (error !== null) throw readableAuthError(error.message);
  }

  async completePasswordRecovery(code: string): Promise<AccountSession> {
    const { data, error } = await this.client.auth.exchangeCodeForSession(code);
    if (error !== null) throw new Error("重置链接无效或已经过期，请重新申请");
    return accountSession(data.user.email);
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password });
    if (error !== null) throw readableAuthError(error.message);
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error !== null) throw new Error("暂时无法退出登录，请稍后重试");
  }

  async redeemInvite(code: string): Promise<RedeemedAccess> {
    const { data, error } = await this.client.rpc("redeem_invite", { p_code: code });
    if (error !== null) {
      if (/exhausted|invalid/i.test(error.message)) {
        throw new Error("邀请码无效、已过期或已被使用");
      }
      throw new Error("权限解锁失败，请稍后重试");
    }
    const rows = (data ?? []) as EntitlementRow[];
    return { packageIds: rows.map((row) => row.package_id) };
  }

  async getAccessState(): Promise<AccountAccessState> {
    const { data: authData, error: authError } = await this.client.auth.getUser();
    if (authError !== null || authData.user === null) {
      return { session: null, packageIds: [] };
    }

    const { data, error } = await this.client
      .from("user_entitlements")
      .select("package_id, expires_at, revoked_at");
    if (error !== null) throw new Error("暂时无法读取账号权限");

    const now = Date.now();
    const rows = (data ?? []) as EntitlementRow[];
    return {
      session: accountSession(authData.user.email),
      packageIds: rows
        .filter((row) =>
          row.revoked_at == null &&
          (row.expires_at === null || Date.parse(row.expires_at) > now),
        )
        .map((row) => row.package_id),
    };
  }
}

export function createAccountAccessService(
  configuration: SupabaseBrowserConfiguration,
  browserOrigin: string,
  sharedClient: SupabaseClient | null = createSupabaseBrowserClient(configuration),
  botProtection: AccountBotProtection = DISABLED_BOT_PROTECTION,
): AccountAccessService {
  if (sharedClient === null) return new UnavailableAccountAccessService();
  return new SupabaseAccountAccessService(
    sharedClient,
    `${browserOrigin}/auth/confirm`,
    `${browserOrigin}/auth/reset`,
    botProtection,
  );
}
