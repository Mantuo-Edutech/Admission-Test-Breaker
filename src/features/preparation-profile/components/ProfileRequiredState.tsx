import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { TmuaPageHeader } from "../../catalog/components/TmuaPageHeader.js";
import { EnglishFirstParagraph, EnglishFirstText } from "../../notes/components/EnglishFirstText.js";

interface ProfileRequiredStateProps {
  issue?: "corrupt" | "unsupported" | null;
}

export function ProfileRequiredState({ issue = null }: ProfileRequiredStateProps) {
  return (
    <main className="tmua-stage-page">
      <TmuaPageHeader />
      <section className="tmua-required-state page-shell">
        <p className="eyebrow">PROFILE FIRST · 课程定位优先</p>
        <h1><EnglishFirstText english="Complete your course profile first" chinese="请先填写课程信息" /></h1>
        <EnglishFirstParagraph
          english="Your current curriculum and modules are needed to map knowledge coverage and preserve meaningful practice evidence."
          chinese="系统需要知道你正在学习的课程与模块，才能生成知识对照并保存练习记录。"
        />
        {issue !== null && (
          <p className="calm-notice" role="status">
            之前的本地档案无法安全恢复，你可以重新建立一份档案。
          </p>
        )}
        <div className="tmua-required-state__privacy">
          <ShieldCheck aria-hidden="true" />
          <EnglishFirstText english="No name, phone number or WeChat is required. The guest profile stays on this device." chinese="不需要填写姓名、电话或微信；档案当前只保存在这台设备。" />
        </div>
        <Link className="button button--primary" to="/exams/tmua/profile">
          <EnglishFirstText english="Complete course profile" chinese="填写课程信息" />
          <ArrowRight aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
