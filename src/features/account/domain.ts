export interface InvitePreview {
  valid: boolean;
  label: string | null;
  packages: readonly string[];
}

export interface AccountSession {
  email: string;
}

export type RegistrationResult =
  | { status: "signed-in"; session: AccountSession }
  | { status: "confirmation-required"; email: string };

export interface RedeemedAccess {
  packageIds: readonly string[];
}

export interface AccountAccessState {
  session: AccountSession | null;
  packageIds: readonly string[];
}

export interface AccountAccessService {
  readonly configured: boolean;
  previewInvite(code: string): Promise<InvitePreview>;
  register(email: string, password: string): Promise<RegistrationResult>;
  signIn(email: string, password: string): Promise<AccountSession>;
  completeEmailConfirmation(code: string): Promise<AccountSession>;
  redeemInvite(code: string): Promise<RedeemedAccess>;
  getAccessState(): Promise<AccountAccessState>;
}

export interface RegistrationInput {
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface RegistrationValidation {
  email?: string;
  password?: string;
  passwordConfirmation?: string;
}

export function normalizeInviteCode(code: string): string {
  return code.trim().replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function inviteCodeLooksValid(code: string): boolean {
  const normalized = normalizeInviteCode(code);
  return normalized.length >= 20 && normalized.length <= 96;
}

export function validateRegistration(
  input: RegistrationInput,
): RegistrationValidation {
  const errors: RegistrationValidation = {};
  const email = input.email.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "请输入有效的邮箱地址";
  }
  if (input.password.length < 10) {
    errors.password = "密码至少需要 10 个字符";
  } else if (
    !/[a-z]/.test(input.password) ||
    !/[A-Z]/.test(input.password) ||
    !/[0-9]/.test(input.password)
  ) {
    errors.password = "密码需要同时包含大写字母、小写字母和数字";
  }
  if (input.passwordConfirmation !== input.password) {
    errors.passwordConfirmation = "两次输入的密码不一致";
  }

  return errors;
}

export function hasRegistrationErrors(
  validation: RegistrationValidation,
): boolean {
  return Object.keys(validation).length > 0;
}
