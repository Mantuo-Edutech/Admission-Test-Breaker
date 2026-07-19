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
        <div><FileCheck2 aria-hidden="true" /><strong>8 道固定题</strong><span>不消耗、不拆分任何历年真题</span></div>
        <div><Scale aria-hidden="true" /><strong>只报告实际表现</strong><span>不把短诊断换算成官方分数或百分位</span></div>
      </section>

      <section className="diagnostic-review-state page-shell">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <p className="eyebrow">当前版本 · ORIGINAL V1</p>
          <h2>8 道原创题已可在线完成</h2>
          <p>
            本卷按公开 TMUA 内容范围独立命题。提交后只显示正确率、答案、每题用时和真实作答记录，不生成官方换算分、录取概率或伪 Benchmark。
          </p>
          <strong>教学预览版本 · 仍待独立教师终审与真实学生标定</strong>
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
