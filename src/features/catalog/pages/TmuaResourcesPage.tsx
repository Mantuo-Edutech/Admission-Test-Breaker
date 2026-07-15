import { useEffect, useState } from "react";
import { BookOpenCheck, CheckCircle2, FileText, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { ProfileRequiredState } from "../../preparation-profile/components/ProfileRequiredState.js";
import { usePreparationProfileContext } from "../../preparation-profile/hooks/usePreparationProfileContext.js";
import {
  WechatAccessDialog,
  type WechatAccessTarget,
} from "../../service-bridge/components/WechatAccessDialog.js";
import { TmuaPageHeader } from "../components/TmuaPageHeader.js";

interface TmuaResourcesPageProps {
  services: AppServices;
}

export function TmuaResourcesPage({ services }: TmuaResourcesPageProps) {
  const { loading, profile, issue } = usePreparationProfileContext(services);
  const [accessTarget, setAccessTarget] = useState<WechatAccessTarget | null>(null);
  const [fullAccess, setFullAccess] = useState(false);

  useEffect(() => {
    let active = true;
    const account = services.accountAccess;
    if (account?.configured !== true) return () => { active = false; };
    void account.getAccessState()
      .then((state) => {
        if (active) setFullAccess(state.packageIds.includes("tmua-full-access"));
      })
      .catch(() => { if (active) setFullAccess(false); });
    return () => { active = false; };
  }, [services.accountAccess]);
  if (loading) return <main className="practice-state-page"><h1>正在打开模考与资料…</h1></main>;
  if (profile === null) return <ProfileRequiredState issue={issue} />;

  return (
    <main className="tmua-stage-page tmua-resources-page">
      <TmuaPageHeader backTo="/exams/tmua/dashboard" backLabel="我的准备路径" />
      <section className="tmua-stage-hero page-shell">
        <p className="eyebrow">模考与复习资料</p>
        <h1>获取完整模考与复习资料</h1>
        <p>{fullAccess ? "当前账号已获得 TMUA 完整资料权限；已审核内容会在这里开放。" : "选择需要的资料，添加冰冰获取邀请码并确认当前版本。"}</p>
      </section>

      <section className="tmua-resources page-shell" aria-labelledby="tmua-resources-title">
        <header className="section-heading">
          <p>选择资料</p>
          <h2 id="tmua-resources-title">你需要哪一类内容？</h2>
          <span>扫码只用于获取资料，不会开放你的学习记录。</span>
        </header>
        <div className="tmua-resources__grid">
          <article className="tmua-resource-card">
            <div className="tmua-resource-card__meta">
              <BookOpenCheck aria-hidden="true" />
              <span>分批开放</span>
            </div>
            <h3>完整模考与逐题复盘</h3>
            <p>{fullAccess ? "已审核并加入权限包的模考，会在系统内开放计时、提交和逐题复盘。" : "按已审核题目组卷，在系统内完成计时、提交和复盘。添加冰冰获取邀请码。"}</p>
            {fullAccess ? (
              <span className="tmua-resource-card__access-state"><CheckCircle2 aria-hidden="true" />账号权限已记录</span>
            ) : (
              <button className="button button--secondary" type="button" onClick={() => setAccessTarget("mock-library")}>
                <LockKeyhole aria-hidden="true" />添加冰冰，获取模考
              </button>
            )}
          </article>
          <article className="tmua-resource-card">
            <div className="tmua-resource-card__meta">
              <FileText aria-hidden="true" />
              <span>按课程体系整理</span>
            </div>
            <h3>完整版复习笔记</h3>
            <p>{fullAccess ? "已审核并加入权限包的版本，会按照课程体系显示知识覆盖、额外知识和重点练习。" : "对照你的课程体系梳理知识覆盖与重点练习。添加冰冰获取邀请码。"}</p>
            {fullAccess ? (
              <span className="tmua-resource-card__access-state"><CheckCircle2 aria-hidden="true" />账号权限已记录</span>
            ) : (
              <button className="button button--secondary" type="button" onClick={() => setAccessTarget("review-notes")}>
                <LockKeyhole aria-hidden="true" />添加冰冰，获取复习笔记
              </button>
            )}
          </article>
        </div>
        <p className="tmua-resources__boundary">
          <LockKeyhole aria-hidden="true" />
          资料验证只确认内容获取资格，不等于授权任何人查看你的学习数据。
        </p>
        <div className="tmua-resources__invite-entry">
          <div>
            <strong>{fullAccess ? "账号权限已确认" : "已经收到邀请码？"}</strong>
            <span>{fullAccess ? "已审核并发布到权限包的内容会自动对这个账号开放。" : "验证后注册或登录，即可把完整内容绑定到你的账号。"}</span>
          </div>
          {fullAccess ? (
            <span className="tmua-resources__verified"><CheckCircle2 aria-hidden="true" />已解锁</span>
          ) : (
            <Link className="button button--primary" to="/access">输入邀请码</Link>
          )}
        </div>
      </section>

      <WechatAccessDialog
        open={accessTarget !== null}
        target={accessTarget ?? "mock-library"}
        onOpenChange={(open) => {
          if (!open) setAccessTarget(null);
        }}
      />
    </main>
  );
}
