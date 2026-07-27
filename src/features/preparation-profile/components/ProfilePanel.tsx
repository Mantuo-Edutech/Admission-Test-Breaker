import { BookMarked, Pencil, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { GuestSpaceId } from "../../../platform/shared/ids.js";
import {
  qualificationById,
  qualificationsForSystem,
  type CurriculumSystemId,
} from "../catalog.js";
import {
  createPreparationProfile,
  type PreparationExperience,
  type PreparationProfile,
} from "../domain.js";

interface ProfilePanelProps {
  guestSpaceId: GuestSpaceId;
  profile: PreparationProfile | null;
  now: () => Date;
  onSave(profile: PreparationProfile): Promise<{ persisted: boolean }>;
  onSaved?(profile: PreparationProfile): void;
  browseHref?: string;
}

const experienceOptions: readonly {
  value: PreparationExperience;
  label: string;
  detail: string;
}[] = [
  { value: "new", label: "Not started", detail: "I only know the test name or format" },
  { value: "sampled", label: "A few questions", detail: "I have tried samples or isolated questions" },
  { value: "mocked", label: "A full mock", detail: "I have completed at least one timed mock" },
  { value: "past-papers", label: "Historical papers", detail: "I have completed one or more historical papers" },
];

function selectionMap(profile: PreparationProfile | null): Record<string, string[]> {
  return Object.fromEntries(
    (profile?.selections ?? []).map((selection) => [
      selection.qualificationId,
      [...selection.unitIds],
    ]),
  );
}

function systemLabel(system: CurriculumSystemId): string {
  return {
    caie: "CAIE",
    "pearson-ial": "Pearson Edexcel IAL",
    ib: "IB Diploma Programme",
    ap: "AP / US Curriculum",
  }[system];
}

function experienceLabel(experience: PreparationExperience): string {
  return experienceOptions.find((option) => option.value === experience)?.label ?? experience;
}

export function ProfilePanel({
  guestSpaceId,
  profile,
  now,
  onSave,
  onSaved,
  browseHref,
}: ProfilePanelProps) {
  const [currentProfile, setCurrentProfile] = useState(profile);
  const [editing, setEditing] = useState(profile === null);
  const [entryCycle, setEntryCycle] = useState(profile?.entryCycle ?? "2027");
  const [system, setSystem] = useState<CurriculumSystemId | null>(
    profile?.curriculumSystem ?? null,
  );
  const [selectedQualificationIds, setSelectedQualificationIds] = useState<string[]>(
    profile?.selections.map((selection) => selection.qualificationId) ?? [],
  );
  const [unitsByQualification, setUnitsByQualification] = useState<Record<string, string[]>>(
    () => selectionMap(profile),
  );
  const [experience, setExperience] = useState<PreparationExperience | null>(
    profile?.experience ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function beginEditing() {
    setEntryCycle(currentProfile?.entryCycle ?? "2027");
    setSystem(currentProfile?.curriculumSystem ?? null);
    setSelectedQualificationIds(
      currentProfile?.selections.map((selection) => selection.qualificationId) ?? [],
    );
    setUnitsByQualification(selectionMap(currentProfile));
    setExperience(currentProfile?.experience ?? null);
    setError(null);
    setEditing(true);
  }

  function chooseSystem(nextSystem: CurriculumSystemId) {
    if (nextSystem === system) return;
    setSystem(nextSystem);
    setSelectedQualificationIds([]);
    setUnitsByQualification({});
    setError(null);
  }

  function toggleQualification(qualificationId: string) {
    setSelectedQualificationIds((current) => {
      if (current.includes(qualificationId)) {
        setUnitsByQualification((units) => {
          const next = { ...units };
          delete next[qualificationId];
          return next;
        });
        return current.filter((id) => id !== qualificationId);
      }
      return [...current, qualificationId];
    });
    setError(null);
  }

  function toggleUnit(qualificationId: string, unitId: string) {
    setUnitsByQualification((current) => {
      const selected = current[qualificationId] ?? [];
      return {
        ...current,
        [qualificationId]: selected.includes(unitId)
          ? selected.filter((id) => id !== unitId)
          : [...selected, unitId],
      };
    });
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (system === null) {
      setError("Choose the curriculum you are studying.");
      return;
    }
    if (selectedQualificationIds.length === 0) {
      setError("Choose at least one qualification or subject.");
      return;
    }
    if (
      selectedQualificationIds.some(
        (qualificationId) => (unitsByQualification[qualificationId] ?? []).length === 0,
      )
    ) {
      setError("Choose at least one module for each selected qualification.");
      return;
    }
    if (experience === null) {
      setError("Choose the practice experience that best matches your current position.");
      return;
    }

    const timestamp = now().toISOString();
    const nextProfile = createPreparationProfile({
      guestSpaceId,
      exam: "TMUA",
      entryCycle,
      curriculumSystem: system,
      selections: selectedQualificationIds.map((qualificationId) => ({
        qualificationId,
        unitIds: unitsByQualification[qualificationId] ?? [],
      })),
      experience,
      createdAt: currentProfile?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });

    setSaving(true);
    try {
      await onSave(nextProfile);
      setCurrentProfile(nextProfile);
      setEditing(false);
      setError(null);
      onSaved?.(nextProfile);
    } finally {
      setSaving(false);
    }
  }

  if (!editing && currentProfile !== null) {
    return (
      <section className="profile-panel profile-panel--summary" aria-labelledby="profile-summary-title">
        <div className="profile-panel__index" aria-hidden="true">01</div>
        <div className="profile-panel__summary-main">
          <p className="profile-panel__kicker">SAVED</p>
          <h2 id="profile-summary-title">Your course profile<small lang="zh-CN">你的课程信息</small></h2>
          <dl className="profile-summary-facts">
            <div><dt>ENTRY CYCLE</dt><dd>{currentProfile.entryCycle} Entry</dd></div>
            <div><dt>CURRICULUM</dt><dd>{systemLabel(currentProfile.curriculumSystem)}</dd></div>
            <div><dt>PRACTICE EXPERIENCE</dt><dd>{experienceLabel(currentProfile.experience)}</dd></div>
          </dl>
          <div className="profile-summary-qualifications">
            {currentProfile.selections.map((selection) => {
              const qualification = qualificationById(selection.qualificationId);
              return (
                <div key={selection.qualificationId}>
                  <h3>{qualification?.label ?? selection.qualificationId}</h3>
                  <p>
                    {selection.unitIds
                      .map(
                        (unitId) =>
                          qualification?.units.find((unit) => unit.id === unitId)?.label ?? unitId,
                      )
                      .join(" · ")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <aside className="profile-panel__evidence" aria-label="Preparation evidence status">
          <BookMarked aria-hidden="true" />
          <p><strong>Course coverage</strong><span>Ready to view</span></p>
          <p><strong>Practice evidence</strong><span>Generated after a full paper</span></p>
          <button className="profile-edit-button" type="button" onClick={beginEditing}>
            <Pencil aria-hidden="true" />Edit profile
          </button>
        </aside>
      </section>
    );
  }

  const qualifications = system === null ? [] : qualificationsForSystem(system);

  return (
    <section className="profile-panel" aria-labelledby="profile-panel-title">
      <div className="profile-panel__index" aria-hidden="true">01</div>
      <div className="profile-panel__intro">
        <p className="profile-panel__kicker">COURSE BACKGROUND</p>
        <h2 id="profile-panel-title">Tell us what you study<small lang="zh-CN">告诉我们你正在学什么</small></h2>
        <p>We use this information to map TMUA knowledge requirements. Course coverage is not treated as a score.</p>
        <p className="profile-panel__privacy">
          <ShieldCheck aria-hidden="true" />
          Your profile stays in your learner space and is private by default.
        </p>
        {browseHref !== undefined && (
          <a className="profile-panel__skip" href={browseHref}>Browse TMUA first</a>
        )}
      </div>

      <form className="profile-form" onSubmit={(event) => void submit(event)}>
        <fieldset>
          <legend><span>01</span>Entry cycle <small>申请年份</small></legend>
          <div className="profile-choice-row">
            {["2027", "2028"].map((cycle) => (
              <label key={cycle} className="profile-choice">
                <input
                  type="radio"
                  name="entry-cycle"
                  value={cycle}
                  checked={entryCycle === cycle}
                  onChange={() => setEntryCycle(cycle)}
                />
                <span><strong>{cycle} Entry</strong><small>{cycle === "2027" ? "Current content cycle" : "Plan your course profile early"}</small></span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend><span>02</span>Curriculum <small>课程体系</small></legend>
          <div className="profile-choice-row">
            <label className="profile-choice">
              <input
                type="radio"
                name="curriculum-system"
                checked={system === "caie"}
                onChange={() => chooseSystem("caie")}
              />
              <span><strong>CAIE</strong><small>Cambridge International</small></span>
            </label>
            <label className="profile-choice">
              <input
                type="radio"
                name="curriculum-system"
                checked={system === "pearson-ial"}
                onChange={() => chooseSystem("pearson-ial")}
              />
              <span><strong>Pearson Edexcel IAL</strong><small>International Advanced Level</small></span>
            </label>
            <label className="profile-choice">
              <input
                type="radio"
                name="curriculum-system"
                checked={system === "ib"}
                onChange={() => chooseSystem("ib")}
              />
              <span><strong>IB Diploma Programme</strong><small>AA / AI · SL / HL</small></span>
            </label>
            <label className="profile-choice">
              <input
                type="radio"
                name="curriculum-system"
                checked={system === "ap"}
                onChange={() => chooseSystem("ap")}
              />
              <span><strong>AP / US Curriculum</strong><small>Precalculus · Calculus AB / BC</small></span>
            </label>
          </div>
        </fieldset>

        {system !== null && (
          <fieldset>
            <legend><span>03</span>Qualifications and modules <small>具体资格与模块</small></legend>
            <div className="profile-qualification-list">
              {qualifications.map((qualification) => {
                const selected = selectedQualificationIds.includes(qualification.id);
                return (
                  <div className="profile-qualification" key={qualification.id}>
                    <label className="profile-qualification__heading">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleQualification(qualification.id)}
                      />
                      <span>
                        <strong>{qualification.label}</strong>
                        <small>Specification {qualification.specificationVersion}</small>
                      </span>
                    </label>
                    {selected && (
                      <div className="profile-unit-grid" aria-label={`${qualification.label} modules`}>
                        {qualification.units.map((unit) => (
                          <label className="profile-unit" key={unit.id}>
                            <input
                              type="checkbox"
                              checked={(unitsByQualification[qualification.id] ?? []).includes(unit.id)}
                              onChange={() => toggleUnit(qualification.id, unit.id)}
                            />
                            <span>{unit.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend><span>04</span>Practice experience <small>目前的练习经历</small></legend>
          <div className="profile-experience-grid">
            {experienceOptions.map((option) => (
              <label className="profile-choice" key={option.value}>
                <input
                  type="radio"
                  name="preparation-experience"
                  checked={experience === option.value}
                  onChange={() => {
                    setExperience(option.value);
                    setError(null);
                  }}
                />
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
              </label>
            ))}
          </div>
        </fieldset>

        {error !== null && <p className="profile-form__error" role="alert">{error}</p>}
        <button className="button button--primary profile-form__submit" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save and view coverage"}
        </button>
      </form>
    </section>
  );
}
