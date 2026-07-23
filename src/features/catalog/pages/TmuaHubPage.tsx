import { ArrowRight, BookOpenCheck, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { usePreparationProfileContext } from "../../preparation-profile/hooks/usePreparationProfileContext.js";
import { TMUA_ONLINE_PAPER_MANIFEST } from "../../practice/content/tmua-online-registry.js";
import { TmuaPageHeader } from "../components/TmuaPageHeader.js";
import { TMUA_PUBLIC_SUMMARY } from "../tmua-summary.js";

interface TmuaHubPageProps {
  services: AppServices;
}

const STARTING_STEPS = [
  {
    number: "01",
    title: "填写课程信息",
    detail: "选择申请年份、课程体系、数学科目与正在学习的模块。",
  },
  {
    number: "02",
    title: "查看覆盖与补学建议",
    detail: "明确哪些知识只需复习、哪些需要检查或补学，并查看具体主题与参考时间。",
  },
  {
    number: "03",
    title: "开始在线练习",
    detail: "进入 18 套完整真题，系统记录作答、修改和实际用时。",
  },
  {
    number: "04",
    title: "根据结果继续训练",
    detail: "回看错题与时间分配，再选择真题、起点诊断或已发布复习资料。",
  },
] as const;

export function TmuaHubPage({ services }: TmuaHubPageProps) {
  const { loading, profile, issue } = usePreparationProfileContext(services);
  const hasProfile = !loading && profile !== null;

  return (
    <main className="tmua-hub-page tmua-overview-page">
      <TmuaPageHeader />

      <section className="tmua-hub-hero page-shell">
        <div>
          <p className="eyebrow">TMUA 准备定位</p>
          <h1><span>先了解起点，</span>{" "}<span>再开始练习</span></h1>
          <p>
            填写正在学习的课程和模块，立即看到哪些知识只需复习、哪些需要补学。
          </p>
          <div className="tmua-overview-page__actions">
            <Link
              className="button button--primary"
              to={hasProfile ? "/exams/tmua/coverage" : "/exams/tmua/profile"}
            >
              {hasProfile ? "查看知识覆盖" : "填写课程信息"}
              <ArrowRight aria-hidden="true" />
            </Link>
            {hasProfile && (
              <Link className="button button--secondary" to="/exams/tmua/profile">
                修改课程信息
              </Link>
            )}
            <Link className="button button--secondary" to="/exams/tmua/past-papers">
              在线练习
            </Link>
          </div>
        </div>
        <dl aria-label="TMUA 真题与在线练习" role="group">
          <div><dt>历年真题</dt><dd>{TMUA_PUBLIC_SUMMARY.paperCount} 套</dd></div>
          <div className="tmua-hub-hero__available"><dt>真题总量</dt><dd>{TMUA_ONLINE_PAPER_MANIFEST.questionCount} 道</dd></div>
          <div>
            <dt>在线练习</dt>
            <dd>{TMUA_PUBLIC_SUMMARY.paperCount} 套全部可作答</dd>
          </div>
        </dl>
      </section>

      {issue !== null && (
        <div className="page-shell calm-notice" role="status">
          之前的本地课程信息无法安全恢复。你可以重新填写，公开考试信息不受影响。
        </div>
      )}

      <section className="tmua-starting-path page-shell" aria-labelledby="tmua-starting-path-title">
        <header className="section-heading">
          <p>你的使用顺序</p>
          <h2 id="tmua-starting-path-title">四步完成 TMUA 准备</h2>
          <span>每一步都有明确结果，完成后再进入下一页。</span>
        </header>
        <ol aria-label="TMUA 分阶段准备路径">
          {STARTING_STEPS.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="tmua-public-boundary page-shell" aria-labelledby="tmua-public-boundary-title">
        <BookOpenCheck aria-hidden="true" />
        <div>
          <h2 id="tmua-public-boundary-title">无需提交联系方式</h2>
          <p>
            课程定位只需要课程与备考信息，不收集姓名、电话或微信。
          </p>
        </div>
        <ShieldCheck aria-hidden="true" />
      </section>
    </main>
  );
}
