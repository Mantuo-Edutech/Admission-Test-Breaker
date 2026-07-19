import { ArrowRight, ShieldCheck } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { ESAT_MODULE_LABELS } from "../esat-admissions.js";
import {
  ESAT_CURRICULA,
  coursesForCurriculum,
  createEsatPreparationPlan,
  loadEsatPreparationPlan,
  saveEsatPreparationPlan,
  type EsatCurriculumId,
} from "../esat-plan.js";
import { EsatPlanRequiredState } from "../components/EsatPlanRequiredState.js";

export function EsatProfilePage({ services }: { services: AppServices }) {
  const navigate = useNavigate();
  const existingPlan = useMemo(() => loadEsatPreparationPlan(globalThis.localStorage), []);
  const [curriculumId, setCurriculumId] = useState<EsatCurriculumId | null>(existingPlan?.curriculumId ?? null);
  const [courseIds, setCourseIds] = useState<readonly string[]>(existingPlan?.courseIds ?? []);
  const [error, setError] = useState<string | null>(null);

  if (existingPlan === null) return <EsatPlanRequiredState />;
  const currentPlan = existingPlan;

  const courseOptions = curriculumId === null ? [] : coursesForCurriculum(curriculumId);

  function chooseCurriculum(next: EsatCurriculumId) {
    if (next === curriculumId) return;
    setCurriculumId(next);
    setCourseIds([]);
    setError(null);
  }

  function toggleCourse(courseId: string) {
    setCourseIds((current) => current.includes(courseId)
      ? current.filter((id) => id !== courseId)
      : [...current, courseId]);
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (curriculumId === null) {
      setError("请选择课程体系。");
      return;
    }
    if (courseIds.length === 0) {
      setError("请至少选择一门正在学习的课程。");
      return;
    }
    const plan = createEsatPreparationPlan({
      programmeIds: currentPlan.programmeIds,
      moduleIds: currentPlan.moduleIds,
      entryCycle: currentPlan.entryCycle,
      curriculumId,
      courseIds,
      updatedAt: new Date().toISOString(),
    });
    saveEsatPreparationPlan(globalThis.localStorage, plan);
    void services.funnel?.track({
      eventType: "profile_completed",
      examId: "esat",
      contextCode: "course-profile",
    });
    navigate("/exams/esat/coverage");
  }

  return (
    <main className="tmua-stage-page esat-stage-page esat-profile-page">
      <SiteHeader examId="esat" />
      <section className="tmua-stage-hero page-shell">
        <p className="eyebrow">第 2 步 · COURSE PROFILE</p>
        <h1>填写你的课程信息<span>Tell us what you study</span></h1>
        <p>系统只对照你需要参加的 {currentPlan.moduleIds.length} 个模块。</p>
      </section>

      <section className="esat-profile-summary page-shell" aria-label="已经确定的 ESAT 模块">
        <div><strong>已确定模块</strong><Link to="/exams/esat">修改专业</Link></div>
        <ul>
          {currentPlan.moduleIds.map((moduleId) => <li key={moduleId}>{ESAT_MODULE_LABELS[moduleId]}</li>)}
        </ul>
      </section>

      <form className="esat-course-form page-shell" onSubmit={submit}>
        <fieldset>
          <legend><span>01</span>课程体系</legend>
          <div className="esat-course-form__curricula">
            {ESAT_CURRICULA.map((curriculum) => (
              <label key={curriculum.id}>
                <input
                  type="radio"
                  name="esat-curriculum"
                  checked={curriculumId === curriculum.id}
                  onChange={() => chooseCurriculum(curriculum.id)}
                />
                <span><strong>{curriculum.label}</strong><small>{curriculum.detail}</small></span>
              </label>
            ))}
          </div>
        </fieldset>

        {curriculumId !== null && (
          <fieldset>
            <legend><span>02</span>正在学习或已经完成的课程</legend>
            <div className="esat-course-form__courses">
              {courseOptions.map((course) => (
                <label key={course.id}>
                  <input
                    type="checkbox"
                    checked={courseIds.includes(course.id)}
                    onChange={() => toggleCourse(course.id)}
                  />
                  <span>{course.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {error !== null && <p className="form-error" role="alert">{error}</p>}
        <div className="esat-course-form__footer">
          <p><ShieldCheck aria-hidden="true" />课程信息只保存在当前设备。</p>
          <button className="button button--primary" type="submit">
            保存并查看知识覆盖
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </form>
    </main>
  );
}
