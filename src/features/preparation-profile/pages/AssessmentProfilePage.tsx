import { ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import {
  ASSESSMENT_CURRICULA,
  ASSESSMENT_EXPERIENCE_OPTIONS,
  ASSESSMENT_LEARNING_STAGES,
  ASSESSMENT_SUBJECT_AREAS,
  ASSESSMENT_WEEKLY_TIME_OPTIONS,
  createAssessmentBackgroundProfile,
  type AssessmentBackgroundProfile,
  type AssessmentCurriculumId,
  type AssessmentLearningStage,
  type AssessmentPreparationExperience,
  type AssessmentProfileExamId,
  type AssessmentSubjectArea,
  type AssessmentWeeklyTime,
} from "../assessment-profile-domain.js";

const examNames: Record<AssessmentProfileExamId, string> = { tara: "TARA", lnat: "LNAT", ucat: "UCAT" };

export function AssessmentProfilePage({ examId, services }: { examId: AssessmentProfileExamId; services: AppServices }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<AssessmentBackgroundProfile | null>(null);
  const [guestSpaceId, setGuestSpaceId] = useState<string | null>(null);
  const [entryCycle, setEntryCycle] = useState<"2027" | "2028">("2027");
  const [curriculumId, setCurriculumId] = useState<AssessmentCurriculumId | null>(null);
  const [learningStage, setLearningStage] = useState<AssessmentLearningStage | null>(null);
  const [subjectAreas, setSubjectAreas] = useState<readonly AssessmentSubjectArea[]>([]);
  const [experience, setExperience] = useState<AssessmentPreparationExperience | null>(null);
  const [weeklyTime, setWeeklyTime] = useState<AssessmentWeeklyTime | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const name = examNames[examId];

  useEffect(() => {
    let active = true;
    void services.guestSpaceStore.loadOrCreate().then(async (guestSpace) => {
      const result = await services.assessmentProfileStore?.load(guestSpace.id, examId)
        ?? { profile: null, issue: null };
      if (!active) return;
      const profile = result.profile;
      setGuestSpaceId(guestSpace.id);
      setExisting(profile);
      if (profile !== null) {
        setEntryCycle(profile.entryCycle);
        setCurriculumId(profile.curriculumId);
        setLearningStage(profile.learningStage);
        setSubjectAreas(profile.subjectAreas);
        setExperience(profile.experience);
        setWeeklyTime(profile.weeklyTime);
      }
      if (result.issue !== null) setWarning(result.issue === "unavailable" ? "账号学习空间暂时无法读取。" : "旧档案无法安全恢复，请重新填写。");
      setLoading(false);
    });
    return () => { active = false; };
  }, [examId, services.assessmentProfileStore, services.guestSpaceStore]);

  function toggleSubject(subject: AssessmentSubjectArea) {
    setSubjectAreas((current) => current.includes(subject) ? current.filter((id) => id !== subject) : [...current, subject]);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (guestSpaceId === null || curriculumId === null || learningStage === null || experience === null || weeklyTime === null || subjectAreas.length === 0) {
      setError("请完成课程体系、年级、学科、练习经历和每周时间后再继续。");
      return;
    }
    const now = services.now().toISOString();
    const profile = createAssessmentBackgroundProfile({
      guestSpaceId,
      examId,
      entryCycle,
      curriculumId,
      learningStage,
      subjectAreas,
      experience,
      weeklyTime,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    const saved = await services.assessmentProfileStore?.save(profile) ?? { persisted: false };
    if (!saved.persisted) setWarning("档案暂时只保留在当前页面；请检查浏览器存储或网络后重试。");
    if (saved.persisted) {
      void services.funnel?.track({
        eventType: "profile_completed",
        examId,
        contextCode: "background-profile",
      });
    }
    navigate(`/exams/${examId}/preparation`);
  }

  return (
    <main className="tmua-stage-page assessment-profile-page">
      <SiteHeader examId={examId} />
      <section className="tmua-stage-hero page-shell">
        <p className="eyebrow">第 1 步 · STUDENT PROFILE</p>
        <h1>填写你的 {name} 背景<span>Tell us where you are starting</span></h1>
        <p>先记录课程体系、年级、学科背景、做题经历和每周时间；这个阶段使用固定规则，不消耗 AI Token。</p>
      </section>

      {loading ? <section className="practice-state-page" aria-live="polite"><p className="eyebrow">正在读取本人档案</p><h2>正在打开…</h2></section> : (
        <form className="esat-course-form assessment-profile-form page-shell" onSubmit={(event) => void submit(event)}>
          <fieldset>
            <legend><span>01</span>申请入学年份 · Entry cycle</legend>
            <div className="esat-course-form__curricula">
              {(["2027", "2028"] as const).map((cycle) => <label key={cycle}><input type="radio" name="entry-cycle" checked={entryCycle === cycle} onChange={() => setEntryCycle(cycle)} /><span><strong>{cycle} Entry</strong><small>计划在 {cycle} 年入学</small></span></label>)}
            </div>
          </fieldset>
          <fieldset>
            <legend><span>02</span>课程体系 · Curriculum</legend>
            <div className="esat-course-form__curricula">
              {ASSESSMENT_CURRICULA.map((option) => <label key={option.id}><input type="radio" name="curriculum" checked={curriculumId === option.id} onChange={() => { setCurriculumId(option.id); setError(null); }} /><span><strong>{option.label}</strong><small>{option.detail}</small></span></label>)}
            </div>
          </fieldset>
          <fieldset>
            <legend><span>03</span>当前年级 · Current stage</legend>
            <div className="esat-course-form__courses assessment-profile-form__compact-options">
              {ASSESSMENT_LEARNING_STAGES.map((option) => <label key={option.id}><input type="radio" name="learning-stage" checked={learningStage === option.id} onChange={() => { setLearningStage(option.id); setError(null); }} /><span>{option.label}</span></label>)}
            </div>
          </fieldset>
          <fieldset>
            <legend><span>04</span>正在学习或已经完成的学科 · Subjects</legend>
            <div className="esat-course-form__courses">
              {ASSESSMENT_SUBJECT_AREAS.map((option) => <label key={option.id}><input type="checkbox" checked={subjectAreas.includes(option.id)} onChange={() => toggleSubject(option.id)} /><span><strong>{option.labelEn}</strong><small>{option.label}</small></span></label>)}
            </div>
          </fieldset>
          <fieldset>
            <legend><span>05</span>目前做题经历 · Practice experience</legend>
            <div className="esat-course-form__courses assessment-profile-form__compact-options">
              {ASSESSMENT_EXPERIENCE_OPTIONS.map((option) => <label key={option.id}><input type="radio" name="experience" checked={experience === option.id} onChange={() => { setExperience(option.id); setError(null); }} /><span>{option.label}</span></label>)}
            </div>
          </fieldset>
          <fieldset>
            <legend><span>06</span>每周可投入时间 · Weekly availability</legend>
            <div className="esat-course-form__courses assessment-profile-form__compact-options">
              {ASSESSMENT_WEEKLY_TIME_OPTIONS.map((option) => <label key={option.id}><input type="radio" name="weekly-time" checked={weeklyTime === option.id} onChange={() => { setWeeklyTime(option.id); setError(null); }} /><span>{option.label}</span></label>)}
            </div>
          </fieldset>
          {error !== null && <p className="form-error" role="alert">{error}</p>}
          {warning !== null && <p className="calm-notice" role="status">{warning}</p>}
          <div className="esat-course-form__footer">
            <p><ShieldCheck aria-hidden="true" />不填写姓名或联系方式；数据归学生本人。</p>
            <button className="button button--primary" type="submit">保存并查看 {name} 起点定位<ArrowRight aria-hidden="true" /></button>
          </div>
        </form>
      )}
    </main>
  );
}
