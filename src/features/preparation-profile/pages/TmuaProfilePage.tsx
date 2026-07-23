import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { TmuaPageHeader } from "../../catalog/components/TmuaPageHeader.js";
import { ProfilePanel } from "../components/ProfilePanel.js";
import type { PreparationProfile } from "../domain.js";
import { usePreparationProfileContext } from "../hooks/usePreparationProfileContext.js";

interface TmuaProfilePageProps {
  services: AppServices;
}

export function TmuaProfilePage({ services }: TmuaProfilePageProps) {
  const navigate = useNavigate();
  const { loading, guestSpace, profile, issue, replaceProfile } =
    usePreparationProfileContext(services);
  const [profilePersistenceWarning, setProfilePersistenceWarning] = useState<
    "device" | "account" | null
  >(null);

  async function saveProfile(nextProfile: PreparationProfile) {
    const result = await services.profileStore.save(nextProfile);
    replaceProfile(nextProfile);
    setProfilePersistenceWarning(
      result.persisted ? null : result.issue === "unavailable" ? "account" : "device",
    );
    if (result.persisted) {
      void services.funnel?.track({
        eventType: "profile_completed",
        examId: "tmua",
        contextCode: "course-profile",
      });
    }
    return result;
  }

  return (
    <main className="tmua-stage-page tmua-profile-page">
      <TmuaPageHeader />
      <section className="tmua-stage-hero page-shell">
        <p className="eyebrow">第 1 步</p>
        <h1>填写你的课程信息</h1>
        <p>选择申请年份、课程体系、正在学习的数学模块和练习经历。</p>
      </section>

      {loading && (
        <section className="practice-state-page" aria-live="polite">
          <p className="eyebrow">正在读取课程信息</p>
          <h2>正在打开你的课程信息…</h2>
        </section>
      )}

      {!loading && guestSpace !== null && (
        <div className="page-shell tmua-profile-wrap">
          {issue !== null && (
            <div className="calm-notice" role="status">
              之前的课程信息无法安全恢复。它已被隔离，你可以重新填写。
            </div>
          )}
          {profilePersistenceWarning !== null && (
            <div className="calm-notice" role="status">
              {profilePersistenceWarning === "account"
                ? "课程信息暂时只保留在当前页面，尚未同步到你的账号。请检查网络后重试。"
                : "档案已保留在当前页面，但浏览器未能把它写入当前设备。"}
            </div>
          )}
          <ProfilePanel
            guestSpaceId={guestSpace.id}
            profile={profile}
            now={services.now}
            onSave={saveProfile}
            onSaved={() => navigate("/exams/tmua/coverage")}
          />
          {profile !== null && (
            <div className="tmua-profile-page__continue">
              <Link className="button button--primary" to="/exams/tmua/coverage">
                查看课程覆盖
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
