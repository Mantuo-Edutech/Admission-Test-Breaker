import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { ExamId } from "../../catalog/exams.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import type { AssessmentProfileExamId } from "../assessment-profile-domain.js";

const examNames: Record<AssessmentProfileExamId, string> = { tara: "TARA", lnat: "LNAT", ucat: "UCAT" };

export function AssessmentProfileRequiredState({ examId, issue = null }: {
  examId: AssessmentProfileExamId;
  issue?: "corrupt" | "unsupported" | "unavailable" | null;
}) {
  const name = examNames[examId];
  return (
    <main className="tmua-stage-page assessment-profile-page">
      <SiteHeader examId={examId as ExamId} />
      <section className="tmua-required-state page-shell">
        <p className="eyebrow">先建立本人档案 · PROFILE FIRST</p>
        <h1>请先填写 {name} 背景信息</h1>
        <p>课程体系、年级、学科背景和现有练习经历会决定后续定位方式；填写完成后再进入题目。</p>
        {issue !== null && (
          <p className="calm-notice" role="status">
            {issue === "unavailable" ? "账号学习空间暂时无法读取，请检查网络后重试。" : "之前的档案无法安全恢复，请重新建立。"}
          </p>
        )}
        <div className="tmua-required-state__privacy">
          <ShieldCheck aria-hidden="true" />
          <span>不收集姓名、电话或微信；未登录时保存在当前设备，登录后进入本人私密学习空间。</span>
        </div>
        <Link className="button button--primary" to={`/exams/${examId}/profile`}>
          填写 {name} 背景信息<ArrowRight aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
