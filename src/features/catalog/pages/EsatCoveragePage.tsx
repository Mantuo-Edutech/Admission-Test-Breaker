import { ArrowRight, CheckCircle2, CircleAlert, SearchCheck } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { EsatPlanRequiredState } from "../components/EsatPlanRequiredState.js";
import { buildEsatCoverage, loadEsatPreparationPlan } from "../esat-plan.js";

const STATUS = {
  covered: {
    label: "Covered by your courses",
    labelZh: "课程知识基本覆盖",
    detail: "Review the key points, then confirm them through practice.",
    icon: CheckCircle2,
  },
  partial: {
    label: "Specific gaps identified",
    labelZh: "发现具体知识缺口",
    detail: "The units to learn and verify are listed below.",
    icon: SearchCheck,
  },
  "not-evidenced": {
    label: "No course evidence found",
    labelZh: "当前课程没有覆盖证据",
    detail: "Learn these units or add more precise course information.",
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
          <p className="eyebrow">ESAT COURSE PROFILE</p>
          <h1>Add your course profile first<small lang="zh-CN">请先填写课程信息</small></h1>
          <p>Choose your curriculum and courses before we map coverage for your ESAT modules.</p>
          <div className="tmua-overview-page__actions">
            <Link className="button button--primary" to="/exams/esat/profile">Add course profile</Link>
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
        <p className="eyebrow">COURSE COVERAGE</p>
        <h1>Your ESAT course coverage<span lang="zh-CN">你的 ESAT 知识覆盖</span></h1>
        <p>
          We checked {unitCount} syllabus units: {coveredUnitCount} have course evidence and {" "}
          {unitCount - coveredUnitCount} need verification or additional study.
        </p>
      </section>

      <section className="esat-coverage-results page-shell" aria-label="ESAT module course coverage">
        {results.map((result, index) => {
          const status = STATUS[result.status];
          const Icon = status.icon;
          return (
            <article key={result.moduleId} className={`esat-coverage-card esat-coverage-card--${result.status}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p>ESAT MODULE</p>
                <h2>{result.label}</h2>
                <ul className="esat-coverage-unit-list" aria-label={`${result.label} syllabus unit coverage`}>
                  {result.units.map((unit) => (
                    <li key={unit.id}>
                      <span>{unit.code}</span>
                      <span>
                        <strong>{unit.labelEn}</strong>
                        <small lang="zh-CN">{unit.label}</small>
                      </span>
                      <em className={`esat-unit-status esat-unit-status--${unit.status}`}>
                        {unit.status === "covered" ? "Covered" : unit.status === "partial" ? "Verify" : "Learn"}
                      </em>
                    </li>
                  ))}
                </ul>
              </div>
              <aside>
                <Icon aria-hidden="true" />
                <h3>{status.label}<small lang="zh-CN">{status.labelZh}</small></h3>
                <p>{status.detail}</p>
                <p className="esat-coverage-count">
                  <strong>{result.coveredUnits.length} / {result.units.length}</strong>
                  syllabus units have clear course evidence
                </p>
                {result.missingUnits.length > 0 && (
                  <section className="esat-coverage-gaps" aria-label={`${result.label} units to learn`}>
                    <h4>TO LEARN <span>需要补充</span></h4>
                    <ul>
                      {result.missingUnits.map((unit) => (
                        <li key={unit.id}><b>{unit.code}</b> {unit.labelEn}<small lang="zh-CN">{unit.label}</small></li>
                      ))}
                    </ul>
                  </section>
                )}
                {result.partialUnits.length > 0 && (
                  <section className="esat-coverage-gaps esat-coverage-gaps--verify" aria-label={`${result.label} units to verify`}>
                    <h4>TO VERIFY <span>需要确认</span></h4>
                    <ul>
                      {result.partialUnits.map((unit) => (
                        <li key={unit.id}><b>{unit.code}</b> {unit.labelEn}<small lang="zh-CN">{unit.label}</small></li>
                      ))}
                    </ul>
                  </section>
                )}
                {result.missingUnits.length === 0 && result.partialUnits.length === 0 && (
                  <p className="esat-coverage-complete">Covered: review only. No additional course is required.<small lang="zh-CN">知识点已覆盖，只需要复习，不需要额外课程。</small></p>
                )}
                {result.evidence.length > 0 && <span>Course evidence: {result.evidence.join(" · ")}</span>}
              </aside>
            </article>
          );
        })}
      </section>

      <div className="tmua-stage-actions page-shell">
        <Link className="button button--secondary" to="/exams/esat/profile">Edit course profile</Link>
        <Link className="button button--primary" to="/exams/esat/past-papers">
          Open online practice
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      <p className="course-coverage-source page-shell">
        This is a rule-based course coverage map, not a measure of actual mastery. It uses the published ESAT syllabus and does not call live AI.
      </p>
    </main>
  );
}
