import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataRightsService, LearningDataExport } from "./domain.js";

const learnerStoragePrefixes = [
  "admission-breaker:",
  "admission-test-breaker:",
  "admission-test-breaker.",
  "tmua:",
  "mantuo.product-funnel",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseLearningDataExport(value: unknown): LearningDataExport {
  if (
    !isRecord(value)
    || (
      value.schemaVersion !== 1
      && value.schemaVersion !== 2
      && value.schemaVersion !== 3
      && value.schemaVersion !== 4
    )
  ) {
    throw new Error("导出的学习数据格式无法验证");
  }
  if (typeof value.exportedAt !== "string" || !isRecord(value.account)) {
    throw new Error("导出的学习数据缺少账号信息");
  }
  const { account } = value;
  if (
    typeof account.email !== "string" ||
    typeof account.platformUserId !== "string" ||
    typeof account.learnerSpaceId !== "string" ||
    !Array.isArray(value.practiceSessions) ||
    !Array.isArray(value.contentEntitlements)
  ) {
    throw new Error("导出的学习数据内容不完整");
  }
  if (value.schemaVersion >= 2 && !Array.isArray(value.feedback)) {
    throw new Error("导出的学习数据缺少反馈记录");
  }
  if (value.schemaVersion >= 3 && !Array.isArray(value.assessmentBackgroundProfiles)) {
    throw new Error("导出的学习数据缺少考试背景档案");
  }
  if (
    value.schemaVersion >= 4
    && (
      !Array.isArray(value.collaborationInvites)
      || !Array.isArray(value.collaborationGrants)
      || !Array.isArray(value.collaborationArtifacts)
      || !Array.isArray(value.collaborationAudit)
    )
  ) {
    throw new Error("导出的学习数据缺少协作授权记录");
  }
  return {
    ...(value as unknown as Omit<LearningDataExport, "feedback">),
    feedback: Array.isArray(value.feedback) ? value.feedback : [],
    assessmentBackgroundProfiles: Array.isArray(value.assessmentBackgroundProfiles)
      ? value.assessmentBackgroundProfiles
      : [],
    collaborationInvites: Array.isArray(value.collaborationInvites)
      ? value.collaborationInvites
      : [],
    collaborationGrants: Array.isArray(value.collaborationGrants)
      ? value.collaborationGrants
      : [],
    collaborationArtifacts: Array.isArray(value.collaborationArtifacts)
      ? value.collaborationArtifacts
      : [],
    collaborationAudit: Array.isArray(value.collaborationAudit)
      ? value.collaborationAudit
      : [],
  };
}

export function clearLocalLearnerData(storage: Storage): void {
  const keys: string[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key !== null && learnerStoragePrefixes.some((prefix) => key.startsWith(prefix))) {
        keys.push(key);
      }
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch {
    // Server deletion remains authoritative if browser storage is unavailable.
  }
}

export class SupabaseDataRightsService implements DataRightsService {
  readonly configured = true;

  constructor(
    private readonly client: SupabaseClient,
    private readonly localStorage: Storage,
    private readonly sessionStorage: Storage,
  ) {}

  async exportMyLearningData(): Promise<LearningDataExport> {
    const { data, error } = await this.client.rpc("export_my_learning_data");
    if (error !== null) throw new Error("暂时无法导出学习数据，请稍后重试");
    return parseLearningDataExport(data);
  }

  async deleteMyAccount(password: string): Promise<void> {
    if (password.length === 0) throw new Error("请输入当前密码");
    const { data: authData, error: authError } = await this.client.auth.getUser();
    const email = authData.user?.email;
    if (authError !== null || email === undefined) {
      throw new Error("无法确认当前账号，请重新登录后再试");
    }

    const { error: verificationError } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (verificationError !== null) throw new Error("当前密码不正确");

    const { error: deletionError } = await this.client.rpc("delete_my_account");
    if (deletionError !== null) throw new Error("账号没有删除成功，请稍后重试");

    clearLocalLearnerData(this.localStorage);
    clearLocalLearnerData(this.sessionStorage);
    await this.client.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
}
