import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { EnglishFirstParagraph, EnglishFirstText } from "../../notes/components/EnglishFirstText.js";

export function EsatPlanRequiredState() {
  return (
    <main className="tmua-stage-page esat-stage-page">
      <SiteHeader examId="esat" />
      <section className="tmua-stage-hero tmua-stage-hero--english-first page-shell">
        <p className="eyebrow">ESAT PROGRAMME MAPPING · 专业定位</p>
        <h1><EnglishFirstText english="Choose your programme first" chinese="请先选择申请专业" /></h1>
        <EnglishFirstParagraph english="Your programme determines the ESAT modules used for curriculum coverage, notes and practice." chinese="系统需要先确定你的 ESAT 模块，才能判断课程覆盖并安排对应内容。" />
        <div className="tmua-overview-page__actions">
          <Link className="button button--primary" to="/exams/esat">
            <EnglishFirstText english="Choose university and programme" chinese="选择学校和专业" />
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
