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
      <TmuaPageHeader backTo="/exams/tmua/dashboard" backLabel="我的准备路径" />
      <section className="tmua-stage-hero page-shell">
        <p className="eyebrow">即将开放</p>
        <h1>30 分钟能力诊断</h1>
        <p>8 道原创固定题，用于观察知识掌握、数学推理和时间分配。</p>
      </section>

      <section className="diagnostic-spec page-shell" aria-label="30 分钟诊断设计">
        <div><Clock3 aria-hidden="true" /><strong>30 分钟</strong><span>与 8 道题的正式节奏一致</span></div>
        <div><FileCheck2 aria-hidden="true" /><strong>8 道固定题</strong><span>同一版本才能形成可比较证据</span></div>
        <div><Scale aria-hidden="true" /><strong>只报告实际表现</strong><span>不把短诊断换算成官方分数或百分位</span></div>
      </section>

      <section className="diagnostic-review-state page-shell">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <p className="eyebrow">当前状态</p>
          <h2>诊断卷正在独立审核</h2>
          <p>
            题目、答案和难度审核完成后才会开放。现有历年真题不会被拆分使用。
          </p>
          <strong>审核完成前不开放作答</strong>
        </div>
      </section>

      <div className="tmua-stage-actions page-shell">
        <Link className="button button--secondary" to="/exams/tmua/dashboard">
          <ArrowLeft aria-hidden="true" />
          返回准备首页
        </Link>
      </div>
    </main>
  );
}
