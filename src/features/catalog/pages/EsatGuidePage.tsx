import { AlertTriangle, CheckCircle2, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import {
  ESAT_ADMISSIONS_REGISTRY,
  ESAT_MODULE_LABELS,
  resolveEsatProgrammeSelection,
} from "../esat-admissions.js";
import {
  createEsatPreparationPlan,
  loadEsatPreparationPlan,
  saveEsatPreparationPlan,
} from "../esat-plan.js";

export function EsatGuidePage({ services }: { services: AppServices }) {
  const navigate = useNavigate();
  const savedPlan = useMemo(() => loadEsatPreparationPlan(globalThis.localStorage), []);
  const [institutionId, setInstitutionId] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(savedPlan?.programmeIds ?? []);
  const [selectedOptionKey, setSelectedOptionKey] = useState(
    savedPlan?.moduleIds.join("|") ?? "",
  );
  const programmes = useMemo(
    () => ESAT_ADMISSIONS_REGISTRY.programmes.filter(
      (programme) => programme.institutionId === institutionId,
    ),
    [institutionId],
  );
  const resolution = resolveEsatProgrammeSelection(selectedIds);
  const selectedModules = resolution.status === "resolved"
    ? resolution.options[0] ?? null
    : resolution.options.find((option) => option.join("|") === selectedOptionKey) ?? null;

  function addProgramme() {
    if (programmeId === "" || selectedIds.includes(programmeId) || selectedIds.length >= 5) return;
    setSelectedIds((current) => [...current, programmeId]);
    setSelectedOptionKey("");
    setProgrammeId("");
  }

  function continueToCourses() {
    if (selectedModules === null) return;
    const plan = createEsatPreparationPlan({
      programmeIds: selectedIds,
      moduleIds: selectedModules,
      entryCycle: savedPlan?.entryCycle ?? "2027",
      curriculumId: savedPlan?.curriculumId ?? null,
      courseIds: savedPlan?.courseIds ?? [],
      updatedAt: new Date().toISOString(),
    });
    saveEsatPreparationPlan(globalThis.localStorage, plan);
    void services.funnel?.track({
      eventType: "exam_selected",
      examId: "esat",
      contextCode: "esat-programme-planner",
    });
    navigate("/exams/esat/profile");
  }

  return (
    <main className="exam-guide-page esat-guide-page">
      <SiteHeader examId="esat" />

      <section className="exam-guide-hero page-shell">
        <div>
          <p className="eyebrow">ESAT · 2027 ENTRY</p>
          <h1>先选专业，再确定考试模块<span>COURSE-TO-MODULE PLANNER</span></h1>
          <p>选择准备申请的学校和专业。确定模块后，下一页会根据你的课程体系判断知识覆盖。</p>
        </div>
      </section>

      <section className="exam-guide-section esat-planner page-shell" aria-labelledby="esat-planner-title">
        <header className="section-heading">
          <p>专业定位 · COURSE SELECTOR</p>
          <h2 id="esat-planner-title">你准备申请哪些专业？</h2>
          <span>最多加入五个选择；不会上传或保存你的申请意向。</span>
        </header>

        <div className="esat-planner__workspace">
          <div className="esat-planner__form">
            <label htmlFor="esat-institution">学校</label>
            <select
              id="esat-institution"
              value={institutionId}
              onChange={(event) => {
                setInstitutionId(event.target.value);
                setProgrammeId("");
              }}
            >
              <option value="">选择学校</option>
              {ESAT_ADMISSIONS_REGISTRY.institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>{institution.name}</option>
              ))}
            </select>

            <label htmlFor="esat-programme">专业</label>
            <select
              id="esat-programme"
              value={programmeId}
              disabled={institutionId === ""}
              onChange={(event) => setProgrammeId(event.target.value)}
            >
              <option value="">选择专业</option>
              {programmes.map((programme) => (
                <option key={programme.id} value={programme.id}>
                  {programme.name} · {programme.ucasCode}
                </option>
              ))}
            </select>

            <button type="button" onClick={addProgramme} disabled={programmeId === "" || selectedIds.length >= 5}>
              <Plus aria-hidden="true" />加入申请选择
            </button>
          </div>

          <div className="esat-planner__selections">
            <p>已选择 {selectedIds.length} / 5</p>
            {resolution.programmes.length === 0 ? (
              <span>选择第一个专业后，这里会立即显示模块结果。</span>
            ) : (
              <ul aria-label="已选择的 ESAT 专业">
                {resolution.programmes.map((programme) => (
                  <li key={programme.id}>
                    <div><strong>{programme.name}</strong><span>{programme.ucasCode}</span></div>
                    <button
                      type="button"
                      aria-label={`移除 ${programme.name}`}
                      onClick={() => {
                        setSelectedIds((current) => current.filter((id) => id !== programme.id));
                        setSelectedOptionKey("");
                      }}
                    >
                      <X aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {resolution.status !== "empty" && (
          <section className={`esat-resolution esat-resolution--${resolution.status}`} aria-live="polite">
            {resolution.status === "conflict" ? (
              <>
                <AlertTriangle aria-hidden="true" />
                <div>
                  <p>模块要求冲突</p>
                  <h3>三个模块无法同时满足这些专业</h3>
                  <span>请调整申请组合；如果必须同时申请，应在预约考试前向 UAT-UK 确认处理方式。</span>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 aria-hidden="true" />
                <div>
                  <p>{resolution.status === "resolved" ? "模块已经确定" : "还需要选择一种组合"}</p>
                  <h3>
                    {(resolution.status === "resolved" ? resolution.options[0] : resolution.fixedModules)
                      ?.map((moduleId) => ESAT_MODULE_LABELS[moduleId]).join(" · ")}
                  </h3>
                  {resolution.options.length > 1 && (
                    <ol aria-label="可满足专业要求的 ESAT 模块组合">
                      {resolution.options.map((option) => (
                        <li key={option.join("-")}>
                          <label>
                            <input
                              type="radio"
                              name="esat-module-combination"
                              value={option.join("|")}
                              checked={selectedOptionKey === option.join("|")}
                              onChange={() => setSelectedOptionKey(option.join("|"))}
                            />
                            <span>{option.map((moduleId) => ESAT_MODULE_LABELS[moduleId]).join(" + ")}</span>
                          </label>
                        </li>
                      ))}
                    </ol>
                  )}
                  {resolution.status === "choice_required" && selectedModules === null && (
                    <span>选择一种模块组合后继续。</span>
                  )}
                </div>
              </>
            )}
          </section>
        )}
        {selectedModules !== null && (
          <div className="esat-planner__continue">
            <div>
              <strong>模块已确认</strong>
              <span>{selectedModules.map((moduleId) => ESAT_MODULE_LABELS[moduleId]).join(" · ")}</span>
            </div>
            <button className="button button--primary" type="button" onClick={continueToCourses}>
              确定模块，填写课程信息
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
