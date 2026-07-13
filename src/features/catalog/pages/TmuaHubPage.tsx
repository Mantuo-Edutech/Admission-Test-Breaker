import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpenCheck, Clock3, LibraryBig } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import {
  LOCAL_DEMO_LEARNER_SPACE_ID,
  LOCAL_DEMO_STUDENT,
} from "../../../app/local-demo.js";
import { BrandMark } from "../../practice/components/BrandMark.js";
import { createPracticeSession } from "../../practice/domain/session.js";
import type { PracticeSession } from "../../practice/domain/session.js";
import {
  TMUA_PUBLIC_SUMMARY,
  type TmuaContentStage,
} from "../tmua-summary.js";

interface TmuaHubPageProps {
  services: AppServices;
}

const STAGE_LABELS: Readonly<Record<TmuaContentStage, string>> = {
  discovered: "已发现",
  indexed: "已建立档案",
  extracted: "已结构化，待核验",
  verified: "已核验",
  published: "可在线练习",
};

export function TmuaHubPage({ services }: TmuaHubPageProps) {
  const navigate = useNavigate();
  const [recoverable, setRecoverable] = useState<PracticeSession | null>(null);
  const [loadIssue, setLoadIssue] = useState<"corrupt" | "unsupported" | null>(null);
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
    const session = createPracticeSession({
      id: services.ids.sessionId(),
      learningSpaceId: LOCAL_DEMO_LEARNER_SPACE_ID,
      actor: LOCAL_DEMO_STUDENT,
      startedAt: services.now().toISOString(),
      eventId: services.ids.eventId(),
    });
    const result = await services.store.save(session);
    navigate("/practice/tmua-2023-paper-1", {
      state: result.persisted ? undefined : { recoveryWarning: true },
    });
  }

  return (
    <main className="tmua-hub-page">
      <header className="site-header page-shell">
        <BrandMark />
        <Link className="tmua-hub-page__back" to="/">
          <ArrowLeft aria-hidden="true" />
          全部考试
        </Link>
      </header>

      <section className="tmua-hub-hero page-shell">
        <div>
          <p className="eyebrow">ADMISSION TEST / TMUA</p>
          <h1><span>TMUA</span>{" "}<span>备考中心</span></h1>
          <p>
            从第一次看题，到诊断、系统训练、完整模考和历年真题复盘，在同一个地方建立你的准备证据。
          </p>
        </div>
        <dl aria-label="TMUA 已核验资料概览">
          <div><dt>试卷</dt><dd>{TMUA_PUBLIC_SUMMARY.paperCount} 套试卷</dd></div>
          <div><dt>题目档案</dt><dd>{TMUA_PUBLIC_SUMMARY.questionShellCount} 道题目档案</dd></div>
          <div><dt>在线练习</dt><dd>{TMUA_PUBLIC_SUMMARY.publishedQuestionCount} 道已可在线练习</dd></div>
        </dl>
      </section>

      <section className="tmua-journey page-shell" aria-labelledby="tmua-journey-title">
        <header className="section-heading section-heading--compact">
          <p>01 / START WHERE YOU ARE</p>
          <h2 id="tmua-journey-title">从你现在最需要的一步开始</h2>
        </header>

        {loadIssue !== null && (
          <div className="calm-notice" role="status">
            上次练习记录无法安全恢复。旧记录已被隔离，你仍可以放心开始一次新练习。
          </div>
        )}

        <ol className="tmua-journey__list" aria-label="TMUA 完整备考路径">
          <li>
            <span>01 · 了解难度</span>
            <h3>先做 5 道题，看看 TMUA 有多难</h3>
            <p>用少量代表题建立直觉，不消耗一整套真题。</p>
            <strong>即将开放</strong>
          </li>
          <li>
            <span>02 · 初步诊断</span>
            <h3>完成约 30 分钟初步诊断</h3>
            <p>判断知识、推理与时间分配中，哪一项最先需要训练。</p>
            <strong>即将开放</strong>
          </li>
          <li className="tmua-journey__practice">
            <span>03 · 完整练习</span>
            <h3>2023 Paper 1 完整练习</h3>
            <p><BookOpenCheck aria-hidden="true" />20 道题</p>
            <p><Clock3 aria-hidden="true" />75 分钟 · 不可使用计算器</p>
            {recoverable === null ? (
              <button
                className="button button--primary"
                type="button"
                disabled={loading || starting}
                onClick={() => void startSession()}
              >
                {starting ? "正在准备试卷…" : "开始 2023 Paper 1 完整练习"}
                <ArrowRight aria-hidden="true" />
              </button>
            ) : (
              <div className="tmua-journey__resume">
                <p>已完成 {Object.keys(recoverable.answers).length} / 20</p>
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => navigate("/practice/tmua-2023-paper-1")}
                >
                  继续 2023 Paper 1
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
            )}
          </li>
          <li>
            <span>04 · 真题复盘</span>
            <h3>历年真题资料馆</h3>
            <p>查看全部九个版本、十八套试卷的归档与在线状态。</p>
            <a href="#past-papers">查看资料馆</a>
          </li>
          <li>
            <span>05 · 申请定位</span>
            <h3>哪些学校和专业需要 TMUA</h3>
            <p>我们正在逐项核验学校、专业、申请年份与官方要求。</p>
            <strong>申请要求整理中</strong>
          </li>
        </ol>
      </section>

      <section className="tmua-archive page-shell" id="past-papers" aria-labelledby="tmua-archive-title">
        <header className="section-heading">
          <p>02 / PAST PAPERS</p>
          <h2 id="tmua-archive-title">历年真题资料馆</h2>
          <span>“已建立档案”表示来源关系已经核验，不代表题目已经开放在线作答。</span>
        </header>

        <div className="tmua-archive__table-wrap">
          <table aria-label="TMUA 历年真题资料馆">
            <thead>
              <tr><th>版本</th><th>试卷</th><th>内容状态</th><th>在线题目</th><th>操作</th></tr>
            </thead>
            <tbody>
              {TMUA_PUBLIC_SUMMARY.editions.flatMap((edition) =>
                edition.papers.map((paper, paperIndex) => {
                  const published = paper.contentStage === "published";
                  return (
                    <tr key={`${edition.id}-paper-${paper.paper}`}>
                      {paperIndex === 0 && <th scope="rowgroup" rowSpan={2}>{edition.label}</th>}
                      <th scope="row">Paper {paper.paper}</th>
                      <td><span className={`archive-stage archive-stage--${paper.contentStage}`}>{STAGE_LABELS[paper.contentStage]}</span></td>
                      <td>{paper.onlineQuestionCount} / 20</td>
                      <td>
                        {published ? (
                          <Link to="/practice/tmua-2023-paper-1">进入在线练习</Link>
                        ) : (
                          <span title="原始资料关系已建立；在线题目内容仍待核验">待内容核验</span>
                        )}
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
        <p className="tmua-archive__note">
          <LibraryBig aria-hidden="true" />
          当前资料层已收录 96 个 PDF 路径并归并为 46 个规范来源；在线发布坚持逐题核验。
        </p>
      </section>
    </main>
  );
}
