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
          <h1>Choose your programme. Find your modules.<span lang="zh-CN">先选专业，再确定考试模块</span></h1>
          <p>Select the universities and courses you plan to apply for. We will identify the ESAT modules you need.</p>
        </div>
      </section>

      <section className="exam-guide-section esat-planner page-shell" aria-labelledby="esat-planner-title">
        <header className="section-heading">
          <p>COURSE SELECTOR</p>
          <h2 id="esat-planner-title">Which courses are you applying for?</h2>
          <span>Add up to five course choices.<small lang="zh-CN">最多可加入五个选择</small></span>
        </header>

        <div className="esat-planner__workspace">
          <div className="esat-planner__form">
            <label htmlFor="esat-institution">University <small>学校</small></label>
            <select
              id="esat-institution"
              value={institutionId}
              onChange={(event) => {
                setInstitutionId(event.target.value);
                setProgrammeId("");
              }}
            >
              <option value="">Choose a university</option>
              {ESAT_ADMISSIONS_REGISTRY.institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>{institution.name}</option>
              ))}
            </select>

            <label htmlFor="esat-programme">Course <small>专业</small></label>
            <select
              id="esat-programme"
              value={programmeId}
              disabled={institutionId === ""}
              onChange={(event) => setProgrammeId(event.target.value)}
            >
              <option value="">Choose a course</option>
              {programmes.map((programme) => (
                <option key={programme.id} value={programme.id}>
                  {programme.name} · {programme.ucasCode}
                </option>
              ))}
            </select>

            <button type="button" onClick={addProgramme} disabled={programmeId === "" || selectedIds.length >= 5}>
              <Plus aria-hidden="true" />Add course
            </button>
          </div>

          <div className="esat-planner__selections">
            <p>SELECTED {selectedIds.length} / 5</p>
            {resolution.programmes.length === 0 ? (
              <span>Your required modules will appear here.</span>
            ) : (
              <ul aria-label="Selected ESAT courses">
                {resolution.programmes.map((programme) => (
                  <li key={programme.id}>
                    <div><strong>{programme.name}</strong><span>{programme.ucasCode}</span></div>
                    <button
                      type="button"
                      aria-label={`Remove ${programme.name}`}
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
                  <p>MODULE CONFLICT</p>
                  <h3>One three-module combination cannot cover these courses.</h3>
                  <span>Change your selection, or confirm the correct booking route with UAT-UK.</span>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 aria-hidden="true" />
                <div>
                  <p>{resolution.status === "resolved" ? "MODULES CONFIRMED" : "CHOOSE A MODULE COMBINATION"}</p>
                  <h3>
                    {(resolution.status === "resolved" ? resolution.options[0] : resolution.fixedModules)
                      ?.map((moduleId) => ESAT_MODULE_LABELS[moduleId]).join(" · ")}
                  </h3>
                  {resolution.options.length > 1 && (
                    <ol aria-label="ESAT module combinations that meet the selected course requirements">
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
                    <span>Choose one module combination to continue.</span>
                  )}
                </div>
              </>
            )}
          </section>
        )}
        {selectedModules !== null && (
          <div className="esat-planner__continue">
            <div>
              <strong>MODULES CONFIRMED</strong>
              <span>{selectedModules.map((moduleId) => ESAT_MODULE_LABELS[moduleId]).join(" · ")}</span>
            </div>
            <button className="button button--primary" type="button" onClick={continueToCourses}>
              Continue to course profile
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
