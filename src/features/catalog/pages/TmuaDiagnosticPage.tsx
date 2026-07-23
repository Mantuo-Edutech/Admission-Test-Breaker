import { ArrowLeft, CheckCircle2, Clock3, FileCheck2, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { ProfileRequiredState } from "../../preparation-profile/components/ProfileRequiredState.js";
import { usePreparationProfileContext } from "../../preparation-profile/hooks/usePreparationProfileContext.js";
import { TmuaPageHeader } from "../components/TmuaPageHeader.js";

interface TmuaDiagnosticPageProps {
  services: AppServices;
}

export function TmuaDiagnosticPage({ services }: TmuaDiagnosticPageProps) {
  const { loading, profile, issue } = usePreparationProfileContext(services);
  if (loading) {
    return <main className="practice-state-page"><h1>正在准备诊断说明…</h1></main>;
  }
  if (profile === null) return <ProfileRequiredState issue={issue} />;

  return (
    <main className="tmua-stage-page tmua-diagnostic-page">
      <TmuaPageHeader />
      <section className="tmua-stage-hero page-shell">
        <p className="eyebrow">在线能力诊断 · STARTING DIAGNOSTIC</p>
        <h1>30 分钟能力诊断<span>30-MINUTE TMUA STARTING DIAGNOSTIC</span></h1>
        <p>8 道满托原创固定题，先观察代数、几何、数列、三角、微积分与证明推理，再决定如何使用真题。</p>
      </section>

      <section className="diagnostic-spec page-shell" aria-label="30 分钟诊断设计">
        <div><Clock3 aria-hidden="true" /><strong>30 分钟</strong><span>每题保留活跃用时与改答记录</span></div>
        <div><FileCheck2 aria-hidden="true" /><strong>8 道原创题</strong><span>覆盖六个核心数学与推理方向</span></div>
        <div><Scale aria-hidden="true" /><strong>起点结果</strong><span>查看正确率、知识表现和做题节奏</span></div>
      </section>

      <section className="diagnostic-review-state page-shell">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <p className="eyebrow">满托原创 · STARTING POINT</p>
          <h2>用 8 道题找到第一轮训练重点</h2>
          <p>
            提交后立即查看正确率、答案、每题用时和知识表现，并根据结果选择真题或针对性复习。
          </p>
          <strong>诊断题不会消耗任何一套历年真题。</strong>
        </div>
      </section>

      <div className="tmua-stage-actions page-shell">
        <Link className="button button--primary" to="/practice/tmua-diagnostic-v1">
          <FileCheck2 aria-hidden="true" />
          开始 30 分钟诊断
        </Link>
        <Link className="button button--secondary" to="/exams/tmua/dashboard">
          <ArrowLeft aria-hidden="true" />
          返回准备首页
        </Link>
      </div>
    </main>
  );
}
