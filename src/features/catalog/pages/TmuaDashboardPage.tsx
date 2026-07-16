import { useEffect, useState } from "react";
import {
  BookOpenCheck,
  Clock3,
  FileText,
  GraduationCap,
  LibraryBig,
  Map,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { isGuestSpaceOwner } from "../../../platform/learning-space/domain.js";
import { ProfileRequiredState } from "../../preparation-profile/components/ProfileRequiredState.js";
import { usePreparationProfileContext } from "../../preparation-profile/hooks/usePreparationProfileContext.js";
import { createPracticeSession } from "../../practice/domain/session.js";
import type { PracticeSession } from "../../practice/domain/session.js";
import { TmuaPageHeader } from "../components/TmuaPageHeader.js";

interface TmuaDashboardPageProps {
  services: AppServices;
}

export function TmuaDashboardPage({ services }: TmuaDashboardPageProps) {
  const navigate = useNavigate();
  const { loading, guestSpace, profile, issue } = usePreparationProfileContext(services);
  const [recoverable, setRecoverable] = useState<PracticeSession | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (guestSpace === null) return;
    let active = true;
    void services.store.loadCurrent().then((result) => {
      if (!active) return;
      const belongsToGuest =
        result.session?.learningSpaceId === guestSpace.id &&
        isGuestSpaceOwner(guestSpace, result.session.startedBy);
      setRecoverable(
        result.session?.status === "active" && belongsToGuest ? result.session : null,
      );
    });
    return () => {
      active = false;
    };
  }, [guestSpace, services.store]);

  if (loading) {
    return (
      <main className="practice-state-page" aria-live="polite">
        <p className="eyebrow">正在打开准备首页</p>
        <h1>正在打开你的 TMUA 准备首页…</h1>
      </main>
    );
  }
  if (profile === null || guestSpace === null) return <ProfileRequiredState issue={issue} />;
  const activeGuestSpace = guestSpace;

  async function startSession() {
    setStarting(true);
    const session = createPracticeSession({
      id: services.ids.sessionId(),
      learningSpaceId: activeGuestSpace.id,
      actor: { kind: "guest", actorId: activeGuestSpace.ownerActorId },
      startedAt: services.now().toISOString(),
      eventId: services.ids.eventId(),
    });
    const result = await services.store.save(session);
    navigate("/practice/tmua-2023-p1", {
      state: result.persisted ? undefined : { recoveryWarning: true },
    });
  }

  return (
    <main className="tmua-stage-page tmua-dashboard-page">
      <TmuaPageHeader backTo="/exams/tmua" backLabel="TMUA 考试介绍" />
      <section className="tmua-stage-hero tmua-dashboard-hero page-shell">
        <div>
          <p className="eyebrow">你的 TMUA 准备首页</p>
          <h1>下一步：完成一套在线真题</h1>
          <p>建议先从已经完成逐题在线排版的 2023 Paper 1 开始；历年真题页另有 17 套原卷可练习。</p>
        </div>
        <Link to="/exams/tmua/profile">修改课程信息</Link>
      </section>

      <section className="tmua-dashboard-primary page-shell" aria-label="推荐下一步">
        <article className="tmua-dashboard-card tmua-dashboard-card--recommended">
          <div className="tmua-dashboard-card__meta">
            <BookOpenCheck aria-hidden="true" />
            <span>推荐下一步</span>
          </div>
          <p className="tmua-dashboard-card__fact">20 道已核验 · 75 分钟 · 不可使用计算器</p>
          <h2>2023 Paper 1 完整练习</h2>
          <p>完成整套试卷，查看正确率、每题用时和作答记录。记录保存在当前设备。</p>
          {recoverable === null ? (
            <button
              className="button button--primary"
              type="button"
              disabled={starting}
              onClick={() => void startSession()}
            >
              {starting ? "正在准备试卷…" : "开始完整练习"}
            </button>
          ) : (
            <button
              className="button button--primary"
              type="button"
              onClick={() => navigate("/practice/tmua-2023-p1")}
            >
              继续练习 · {Object.keys(recoverable.answers).length} / 20
            </button>
          )}
        </article>
      </section>

      <section className="tmua-dashboard-secondary page-shell" aria-labelledby="tmua-dashboard-secondary-title">
        <header className="section-heading section-heading--compact">
          <p>随时查看</p>
          <h2 id="tmua-dashboard-secondary-title">其他可用内容</h2>
        </header>
        <div className="tmua-dashboard-grid" aria-label="其他可用内容">
          <article className="tmua-dashboard-card">
            <div className="tmua-dashboard-card__meta"><Map aria-hidden="true" /><span>已生成</span></div>
            <h2>课程覆盖与补学建议<span>Course Coverage Plan</span></h2>
            <p>查看哪些知识只需复习、哪些需要检查或补学，以及具体主题和参考时间。</p>
            <Link className="button button--secondary" to="/exams/tmua/coverage">查看学习建议</Link>
          </article>

        <article className="tmua-dashboard-card">
          <div className="tmua-dashboard-card__meta"><LibraryBig aria-hidden="true" /><span>18 套可练习</span></div>
          <h2>历年真题</h2>
          <p>选择任一历年试卷，直接计时作答并提交评分。</p>
          <Link className="button button--secondary" to="/exams/tmua/past-papers">查看历年真题</Link>
        </article>

        <article className="tmua-dashboard-card">
          <div className="tmua-dashboard-card__meta"><FileText aria-hidden="true" /><span>分批整理</span></div>
          <h2>模考与复习资料</h2>
          <p>获取完整模考，以及按课程体系整理的复习资料。</p>
          <Link className="button button--secondary" to="/exams/tmua/resources">查看模考与资料</Link>
        </article>
        </div>
      </section>

      <section className="tmua-dashboard-upcoming page-shell" aria-labelledby="tmua-dashboard-upcoming-title">
        <div>
          <p className="eyebrow">正在准备</p>
          <h2 id="tmua-dashboard-upcoming-title">达到审核标准后再开放</h2>
        </div>
        <ul>
          <li><Clock3 aria-hidden="true" /><span><strong>30 分钟能力诊断</strong>原创固定题正在独立审核</span></li>
          <li><GraduationCap aria-hidden="true" /><span><strong>院校与专业要求</strong>按申请年份核验官方来源</span></li>
        </ul>
      </section>
    </main>
  );
}
