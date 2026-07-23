import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";

export function EsatPlanRequiredState() {
  return (
    <main className="tmua-stage-page esat-stage-page">
      <SiteHeader examId="esat" />
      <section className="tmua-stage-hero page-shell">
        <p className="eyebrow">ESAT 专业定位</p>
        <h1>请先选择申请专业</h1>
        <p>系统需要先确定你的 ESAT 模块，才能判断课程覆盖并安排对应内容。</p>
        <div className="tmua-overview-page__actions">
          <Link className="button button--primary" to="/exams/esat">
            选择学校和专业
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
