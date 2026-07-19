import {
  isAuthSessionMissingError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { parseStoredPracticeSession } from "../practice/storage/local-store.js";
import { parseStoredPreparationProfile } from "../preparation-profile/storage/local-store.js";
import type {
  AuthenticatedLearnerContext,
  LearnerDataRepository,
} from "./repository.js";
import { LearnerDataUnavailableError } from "./repository.js";
import type { PracticeSession } from "../practice/domain/session.js";
import type { PreparationProfile } from "../preparation-profile/domain.js";

interface AppUserRow {
  auth_user_id: string;
  platform_user_id: string;
}

interface LearnerSpaceRow {
  id: string;
  owner_user_id: string;
}

interface ProfileRow {
  profile: unknown;
}

interface SessionRow {
  snapshot: unknown;
}

function unavailable(label: string): LearnerDataUnavailableError {
  return new LearnerDataUnavailableError(`${label}，请检查网络后重试`);
}

export class SupabaseLearnerDataRepository implements LearnerDataRepository {
  constructor(private readonly client: SupabaseClient) {}

  async currentContext(): Promise<AuthenticatedLearnerContext | null> {
    const { data: authData, error: authError } = await this.client.auth.getUser();
    if (authError !== null) {
      if (isAuthSessionMissingError(authError)) return null;
      throw unavailable("无法确认登录状态");
    }
    if (authData.user === null) return null;

    const [{ data: appUserData, error: appUserError }, { data: learnerData, error: learnerError }] =
      await Promise.all([
        this.client
          .from("app_users")
          .select("auth_user_id, platform_user_id")
          .eq("auth_user_id", authData.user.id)
          .single(),
        this.client
          .from("learner_spaces")
          .select("id, owner_user_id")
          .eq("owner_user_id", authData.user.id)
          .eq("status", "active")
          .single(),
      ]);

    if (appUserError !== null || learnerError !== null) {
      throw unavailable("无法读取你的学习空间");
    }
    const appUser = appUserData as AppUserRow;
    const learnerSpace = learnerData as LearnerSpaceRow;
    if (
      appUser.auth_user_id !== authData.user.id ||
      learnerSpace.owner_user_id !== authData.user.id
    ) {
      throw new LearnerDataUnavailableError("学习空间身份校验失败");
    }
    return {
      authUserId: authData.user.id,
      platformUserId: appUser.platform_user_id,
      learnerSpaceId: learnerSpace.id,
    };
  }

  async loadPreparationProfile(): Promise<PreparationProfile | null> {
    const context = await this.requireContext();
    const { data, error } = await this.client
      .from("preparation_profiles")
      .select("profile")
      .eq("learner_space_id", context.learnerSpaceId)
      .maybeSingle();
    if (error !== null) throw unavailable("无法读取课程档案");
    if (data === null) return null;
    return parseStoredPreparationProfile((data as ProfileRow).profile);
  }

  async savePreparationProfile(
    profile: PreparationProfile,
  ): Promise<PreparationProfile> {
    parseStoredPreparationProfile(JSON.parse(JSON.stringify(profile)) as unknown);
    const { data, error } = await this.client.rpc("save_preparation_profile", {
      p_profile: profile,
    });
    if (error !== null) {
      if (/already_claimed/i.test(error.message)) {
        throw new LearnerDataUnavailableError("这份访客课程档案已经归属另一个账号");
      }
      throw unavailable("课程档案没有同步成功");
    }
    return parseStoredPreparationProfile(data);
  }

  async deletePreparationProfile(): Promise<void> {
    const { error } = await this.client.rpc("delete_preparation_profile");
    if (error !== null) throw unavailable("课程档案没有删除成功");
  }

  async loadCurrentPracticeSession(): Promise<PracticeSession | null> {
    const context = await this.requireContext();
    const { data, error } = await this.client
      .from("practice_sessions")
      .select("snapshot")
      .eq("learner_space_id", context.learnerSpaceId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error !== null) throw unavailable("无法读取练习记录");
    if (data === null) return null;
    return parseStoredPracticeSession((data as SessionRow).snapshot);
  }

  async listPracticeSessions(limit: number): Promise<readonly PracticeSession[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("Practice history limit must be an integer between 1 and 100");
    }
    const context = await this.requireContext();
    const { data, error } = await this.client
      .from("practice_sessions")
      .select("snapshot")
      .eq("learner_space_id", context.learnerSpaceId)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error !== null) throw unavailable("无法读取练习历史");
    return (data as SessionRow[]).map((row) => parseStoredPracticeSession(row.snapshot));
  }

  async savePracticeSession(session: PracticeSession): Promise<PracticeSession> {
    parseStoredPracticeSession(JSON.parse(JSON.stringify(session)) as unknown);
    const { data, error } = await this.client.rpc("save_practice_session", {
      p_session: session,
    });
    if (error !== null) {
      if (/already_claimed|already_owned|tenant_invalid/i.test(error.message)) {
        throw new LearnerDataUnavailableError("这份练习记录不属于当前账号");
      }
      if (/stale|idempotency_conflict/i.test(error.message)) {
        throw new LearnerDataUnavailableError("云端已有更新的练习记录，请刷新后继续");
      }
      throw unavailable("练习记录没有同步成功");
    }
    return parseStoredPracticeSession(data);
  }

  private async requireContext(): Promise<AuthenticatedLearnerContext> {
    const context = await this.currentContext();
    if (context === null) {
      throw new LearnerDataUnavailableError("请先登录，再同步学习数据");
    }
    return context;
  }
}
