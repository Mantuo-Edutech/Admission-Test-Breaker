import { useEffect, useState } from "react";
import {
  BookOpenCheck,
  FileText,
  LibraryBig,
  Map,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { isGuestSpaceOwner } from "../../../platform/learning-space/domain.js";
import { ProfileRequiredState } from "../../preparation-profile/components/ProfileRequiredState.js";
import { usePreparationProfileContext } from "../../preparation-profile/hooks/usePreparationProfileContext.js";
import type { PracticeSession } from "../../practice/domain/session.js";
import { TmuaPageHeader } from "../components/TmuaPageHeader.js";

interface TmuaDashboardPageProps {
  services: AppServices;
}

export function TmuaDashboardPage({ services }: TmuaDashboardPageProps) {
  const { loading, guestSpace, profile, issue } = usePreparationProfileContext(services);
  const [recoverable, setRecoverable] = useState<PracticeSession | null>(null);

  useEffect(() => {
    if (guestSpace === null) return;
    let active = true;
    void services.store.loadCurrent().then((result) => {
      if (!active) return;
      const belongsToGuest =
        result.session?.learningSpaceId === guestSpace.id &&
        isGuestSpaceOwner(guestSpace, result.session.startedBy);
      const belongsToAuthenticatedStudent =
        result.session?.learningSpaceId.startsWith("lsp_") === true &&
        result.session.startedBy.kind === "student";
      setRecoverable(
        result.session?.status === "active" &&
          (belongsToGuest || belongsToAuthenticatedStudent)
          ? result.session
          : null,
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
  return (
    <main className="tmua-stage-page tmua-dashboard-page">
      <TmuaPageHeader />
      <section className="tmua-stage-hero tmua-dashboard-hero page-shell">
        <div>
          <p className="eyebrow">你的 TMUA 准备首页</p>
          <h1>下一步：先做 30 分钟能力诊断</h1>
          <p>先用 8 道原创题观察知识、推理与节奏，不消耗历年真题；之后再根据真实表现选择主题训练或完整试卷。</p>
        </div>
        <Link to="/exams/tmua/profile">修改课程信息</Link>
      </section>

      <section className="tmua-dashboard-primary page-shell" aria-label="推荐下一步">
        <article className="tmua-dashboard-card tmua-dashboard-card--recommended">
          <div className="tmua-dashboard-card__meta">
            <BookOpenCheck aria-hidden="true" />
            <span>推荐下一步</span>
          </div>
          <p className="tmua-dashboard-card__fact">8 道满托原创 · 30 分钟 · 不可使用计算器</p>
          <h2>TMUA 起点能力诊断<span>TMUA Starting Diagnostic</span></h2>
          <p>覆盖代数、二次方程、坐标几何、数列、三角、微积分、数学逻辑和反例；只报告实际作答证据。</p>
          {recoverable === null ? (
            <Link className="button button--primary" to="/practice/tmua-diagnostic-v1">
              开始 30 分钟诊断
            </Link>
          ) : (
            <Link className="button button--primary" to={`/practice/${recoverable.paperId}`}>
              继续当前练习 · {Object.keys(recoverable.answers).length} 道已作答
            </Link>
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
          <div className="tmua-dashboard-card__meta"><FileText aria-hidden="true" /><span>4 项真实资料</span></div>
          <h2>复习笔记与逐题解析</h2>
          <p>打开基础笔记；邀请码可解锁六周训练计划和 Early Specimen Paper 1 逐题解析。</p>
          <Link className="button button--secondary" to="/exams/tmua/resources">查看题库与学习资料</Link>
        </article>
        </div>
      </section>

    </main>
  );
}
