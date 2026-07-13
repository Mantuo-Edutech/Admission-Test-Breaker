import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  Clock3,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import type { AppServices } from "../../../app/dependencies.js";
import {
  LOCAL_DEMO_LEARNER_SPACE_ID,
  LOCAL_DEMO_STUDENT,
} from "../../../app/local-demo.js";
import { createPracticeSession } from "../domain/session.js";
import type { PracticeSession } from "../domain/session.js";
import { AcademicIllustration } from "../components/AcademicIllustration.js";
import { BrandMark } from "../components/BrandMark.js";

interface LandingPageProps {
  services: AppServices;
}

export function LandingPage({ services }: LandingPageProps) {
  const navigate = useNavigate();
  const [recoverable, setRecoverable] = useState<PracticeSession | null>(null);
  const [loadIssue, setLoadIssue] = useState<"corrupt" | "unsupported" | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let active = true;
    void services.store.loadCurrent().then((result) => {
      if (!active) return;
      setLoadIssue(result.issue);
      setRecoverable(result.session?.status === "active" ? result.session : null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [services.store]);

  async function startSession() {
    setStarting(true);
    const startedAt = services.now().toISOString();
    const session = createPracticeSession({
      id: services.ids.sessionId(),
      learnerSpaceId: LOCAL_DEMO_LEARNER_SPACE_ID,
      actor: LOCAL_DEMO_STUDENT,
      startedAt,
      eventId: services.ids.eventId(),
    });
    const result = await services.store.save(session);
    navigate("/practice/tmua-2023-paper-1", {
      state: result.persisted ? undefined : { recoveryWarning: true },
    });
  }

  function resumeSession() {
    navigate("/practice/tmua-2023-paper-1");
  }

  return (
    <main className="landing-page">
      <header className="site-header page-shell">
        <BrandMark />
        <div className="site-header__status">
          <span className="status-dot" aria-hidden="true" />
          开放练习 · Beta
        </div>
      </header>

      <section className="landing-hero page-shell">
        <div className="landing-hero__copy">
          <p className="eyebrow">TMUA 2023 · PAPER 1</p>
          <h1>把焦虑，拆成每一道题。</h1>
          <p className="landing-hero__lead">
            一份完整、经人工核验的真实练习。先安静地做完，再用属于你的数据理解节奏、错误和下一步。
          </p>

          <ul className="paper-facts" aria-label="试卷信息">
            <li><BookOpenCheck aria-hidden="true" />20 道题</li>
            <li><Clock3 aria-hidden="true" />75 分钟</li>
            <li><ShieldCheck aria-hidden="true" />不可使用计算器</li>
          </ul>

          {loadIssue !== null && (
            <div className="calm-notice" role="status">
              上次练习记录无法安全恢复。旧记录已被隔离，你可以放心开始一次新练习。
            </div>
          )}

          <div className="landing-actions">
            <button
              className="button button--primary"
              type="button"
              onClick={() => void startSession()}
              disabled={starting || loading}
            >
              {starting ? "正在准备试卷…" : "开始完整模考"}
              <ArrowRight aria-hidden="true" />
            </button>

            {recoverable !== null && (
              <div className="resume-card">
                <div>
                  <span>上次练习</span>
                  <strong>
                    已完成 {Object.keys(recoverable.answers).length} / 20
                  </strong>
                </div>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={resumeSession}
                >
                  继续上次练习
                </button>
              </div>
            )}
          </div>

          <p className="local-data-note">
            <LockKeyhole aria-hidden="true" />
            当前体验的数据仅在当前设备保存；生产级私密账户与逐项授权将在下一阶段接入。
          </p>
        </div>

        <div className="landing-hero__visual">
          <div className="illustration-frame">
            <span className="illustration-index">REF. 01 / PRACTICE COMMONS</span>
            <AcademicIllustration />
          </div>
          <p className="illustration-caption">
            知识不是围墙。它应当是一间任何人都能推门进入的书房。
          </p>
        </div>
      </section>

      <section className="trust-ledger page-shell" aria-label="项目承诺">
        <article>
          <span>01</span>
          <h2>内容有出处</h2>
          <p>20 道题逐页核验，答案和来源版本可追溯。</p>
        </article>
        <article>
          <span>02</span>
          <h2>学习数据归你</h2>
          <p>只记录有学习意义的动作；未来由学生逐项授权老师、家长或 Agent。</p>
        </article>
        <article>
          <span>03</span>
          <h2>结论保持诚实</h2>
          <p>样本不足就明确说不足，不伪造百分位和准备度。</p>
        </article>
      </section>

      <footer className="landing-footer page-shell">
        <p><strong>由满托发起</strong>，与学习者共同建设。</p>
        <p>练习保持开放 · 深度解读与专业服务由你选择</p>
      </footer>
    </main>
  );
}
