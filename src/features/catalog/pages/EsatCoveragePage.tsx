import { ArrowRight, CheckCircle2, CircleAlert, SearchCheck } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { EsatPlanRequiredState } from "../components/EsatPlanRequiredState.js";
import { buildEsatCoverage, loadEsatPreparationPlan } from "../esat-plan.js";

const STATUS = {
  covered: {
    label: "课程知识基本覆盖",
    detail: "先复习重点，再用练习确认掌握。",
    icon: CheckCircle2,
  },
  partial: {
    label: "发现具体知识缺口",
    detail: "下面已经分开列出需要补充和需要确认的知识单元。",
    icon: SearchCheck,
  },
  "not-evidenced": {
    label: "当前课程没有覆盖证据",
    detail: "这些知识单元需要补学，或补充更准确的课程信息。",
    icon: CircleAlert,
  },
} as const;

export function EsatCoveragePage() {
  const plan = useMemo(() => loadEsatPreparationPlan(globalThis.localStorage), []);
  if (plan === null) return <EsatPlanRequiredState />;
  if (plan.curriculumId === null) {
    return (
      <main className="tmua-stage-page esat-stage-page">
        <SiteHeader examId="esat" />
        <section className="tmua-stage-hero page-shell">
          <p className="eyebrow">ESAT 课程信息</p>
          <h1>请先填写课程信息</h1>
          <p>确定课程体系和具体科目后，系统才能判断所选模块的知识覆盖。</p>
          <div className="tmua-overview-page__actions">
            <Link className="button button--primary" to="/exams/esat/profile">填写课程信息</Link>
          </div>
        </section>
      </main>
    );
  }

  const results = buildEsatCoverage(plan);
  const unitCount = results.reduce((sum, result) => sum + result.units.length, 0);
  const coveredUnitCount = results.reduce((sum, result) => sum + result.coveredUnits.length, 0);

  return (
    <main className="tmua-stage-page esat-stage-page esat-coverage-page">
      <SiteHeader examId="esat" />
      <section className="tmua-stage-hero page-shell">
        <p className="eyebrow">第 3 步 · COURSE COVERAGE</p>
        <h1>你的 ESAT 知识覆盖<span>Your ESAT Course Coverage</span></h1>
        <p>
          已逐项核对 {unitCount} 个官方知识单元：{coveredUnitCount} 个已有课程覆盖证据，
          {unitCount - coveredUnitCount} 个需要确认或补充。
        </p>
      </section>

      <section className="esat-coverage-results page-shell" aria-label="ESAT 模块知识覆盖">
        {results.map((result, index) => {
          const status = STATUS[result.status];
          const Icon = status.icon;
          return (
            <article key={result.moduleId} className={`esat-coverage-card esat-coverage-card--${result.status}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p>ESAT MODULE</p>
                <h2>{result.label}</h2>
                <ul className="esat-coverage-unit-list" aria-label={`${result.label}知识单元覆盖清单`}>
                  {result.units.map((unit) => (
                    <li key={unit.id}>
                      <span>{unit.code}</span>
                      <span>
                        <strong>{unit.label}</strong>
                        <small>{unit.labelEn}</small>
                      </span>
                      <em className={`esat-unit-status esat-unit-status--${unit.status}`}>
                        {unit.status === "covered" ? "已覆盖" : unit.status === "partial" ? "需确认" : "需补充"}
                      </em>
                    </li>
                  ))}
                </ul>
              </div>
              <aside>
                <Icon aria-hidden="true" />
                <h3>{status.label}</h3>
                <p>{status.detail}</p>
                <p className="esat-coverage-count">
                  <strong>{result.coveredUnits.length} / {result.units.length}</strong>
                  个知识单元有明确覆盖证据
                </p>
                {result.missingUnits.length > 0 && (
                  <section className="esat-coverage-gaps" aria-label={`${result.label}需要补充`}>
                    <h4>需要补充 <span>TO LEARN</span></h4>
                    <ul>
                      {result.missingUnits.map((unit) => (
                        <li key={unit.id}><b>{unit.code}</b> {unit.label}<small>{unit.labelEn}</small></li>
                      ))}
                    </ul>
                  </section>
                )}
                {result.partialUnits.length > 0 && (
                  <section className="esat-coverage-gaps esat-coverage-gaps--verify" aria-label={`${result.label}需要确认`}>
                    <h4>需要确认 <span>TO VERIFY</span></h4>
                    <ul>
                      {result.partialUnits.map((unit) => (
                        <li key={unit.id}><b>{unit.code}</b> {unit.label}<small>{unit.labelEn}</small></li>
                      ))}
                    </ul>
                  </section>
                )}
                {result.missingUnits.length === 0 && result.partialUnits.length === 0 && (
                  <p className="esat-coverage-complete">知识点已覆盖，只需要复习，不需要额外课程。</p>
                )}
                {result.evidence.length > 0 && <span>课程依据：{result.evidence.join(" · ")}</span>}
              </aside>
            </article>
          );
        })}
      </section>

      <div className="tmua-stage-actions page-shell">
        <Link className="button button--secondary" to="/exams/esat/profile">修改课程信息</Link>
        <Link className="button button--primary" to="/exams/esat/dashboard">
          进入我的准备
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      <p className="course-coverage-source page-shell">
        这是按官方 ESAT 一级知识单元生成的课程范围初判，不代表实际掌握程度。结论由固定课程映射生成，不调用实时 AI。
      </p>
    </main>
  );
}
