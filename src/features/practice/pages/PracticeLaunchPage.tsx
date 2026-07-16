import { useEffect, useState } from "react";
import { FileCheck2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { TmuaPageHeader } from "../../catalog/components/TmuaPageHeader.js";
import { ProfileRequiredState } from "../../preparation-profile/components/ProfileRequiredState.js";
import { usePreparationProfileContext } from "../../preparation-profile/hooks/usePreparationProfileContext.js";
import { getTmuaPracticePaper } from "../content/tmua-online-registry.js";
import { createPracticeSession, type PracticeSession } from "../domain/session.js";

export function PracticeLaunchPage({ services }: { services: AppServices }) {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const { loading, guestSpace, profile, issue } = usePreparationProfileContext(services);
  const [current, setCurrent] = useState<PracticeSession | null>(null);
  const [starting, setStarting] = useState(false);
  const paper = paperId === undefined ? null : getTmuaPracticePaper(paperId);

  useEffect(() => {
    let active = true;
    void services.store.loadCurrent().then((result) => {
      if (active) setCurrent(result.session?.status === "active" ? result.session : null);
    });
    return () => { active = false; };
  }, [services.store]);

  if (loading) return <main className="practice-state-page"><h1>正在准备试卷…</h1></main>;
  if (profile === null || guestSpace === null) return <ProfileRequiredState issue={issue} />;
  if (paper === null) {
    return (
      <main className="practice-state-page">
        <h1>没有找到这套试卷</h1>
        <Link className="button button--primary" to="/exams/tmua/past-papers">返回历年真题</Link>
      </main>
    );
  }

  async function start() {
    if (paper === null || guestSpace === null) return;
    setStarting(true);
    const session = createPracticeSession({
      id: services.ids.sessionId(),
      learningSpaceId: guestSpace.id,
      actor: { kind: "guest", actorId: guestSpace.ownerActorId },
      paperId: paper.id,
      startedAt: services.now().toISOString(),
      eventId: services.ids.eventId(),
    });
    const saved = await services.store.save(session);
    navigate(`/practice/${paper.id}`, {
      replace: true,
      state: saved.persisted ? undefined : { recoveryWarning: true },
    });
  }

  const canResume = current?.paperId === paper.id;
  return (
    <main className="tmua-stage-page practice-launch-page">
      <TmuaPageHeader backTo="/exams/tmua/past-papers" backLabel="历年真题" />
      <section className="tmua-stage-hero page-shell">
        <p className="eyebrow">开始在线练习</p>
        <h1>{paper.edition} Paper {paper.paper}</h1>
        <p>20 道题，75 分钟。系统会保存答案、改答、标记、每题活跃用时和提交结果。</p>
      </section>
      <section className="practice-launch-card page-shell">
        <FileCheck2 aria-hidden="true" />
        <div>
          <p className="eyebrow">练习方式</p>
          <h2>{paper.deliveryMode === "structured" ? "逐题在线排版" : "原版试卷 + 在线答题卡"}</h2>
          <p>{paper.deliveryMode === "structured" ? "题面、选项和图形已经逐题排版。" : "系统直接显示原始 PDF，避免数学公式在自动转写中失真；作答和评分仍在系统内完成。"}</p>
          <button
            className="button button--primary"
            type="button"
            disabled={starting}
            onClick={() => void (canResume ? navigate(`/practice/${paper.id}`) : start())}
          >
            {starting ? "正在创建练习…" : canResume ? "继续这套练习" : current === null ? "开始练习" : "开始并替换当前练习"}
          </button>
        </div>
      </section>
    </main>
  );
}
