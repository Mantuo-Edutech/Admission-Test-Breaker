import { useMemo } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { getAssessmentDefinition } from "../../practice/catalog/assessment-registry.js";
import { publicHistoricPracticeForExam } from "../../practice/content/historic-practice-catalog.js";
import {
  PracticeEntrySection,
  PracticeLibraryHero,
  type PracticeEntry,
} from "../components/PracticeLibrary.js";
import { ESAT_MODULE_LABELS, type EsatModuleId } from "../esat-admissions.js";
import { loadEsatPreparationPlan } from "../esat-plan.js";

const fullMockByModule: Readonly<Record<EsatModuleId, {
  readonly paperId: string;
  readonly label: string;
  readonly labelZh: string;
  readonly range: string;
}>> = {
  "mathematics-1": {
    paperId: "esat-mathematics-1-full-mock-v1",
    label: "Mathematics 1",
    labelZh: "数学 1",
    range: "M1–M7",
  },
  "mathematics-2": {
    paperId: "esat-mathematics-2-full-mock-v1",
    label: "Mathematics 2",
    labelZh: "数学 2",
    range: "MM1–MM8",
  },
  physics: {
    paperId: "esat-physics-full-mock-v1",
    label: "Physics",
    labelZh: "物理",
    range: "P1–P7",
  },
  chemistry: {
    paperId: "esat-chemistry-full-mock-v1",
    label: "Chemistry",
    labelZh: "化学",
    range: "C1–C17",
  },
  biology: {
    paperId: "esat-biology-full-mock-v1",
    label: "Biology",
    labelZh: "生物",
    range: "B1–B11",
  },
};

export function EsatPastPapersPage() {
  const plan = useMemo(() => loadEsatPreparationPlan(globalThis.localStorage), []);
  const assessment = getAssessmentDefinition("esat");
  const sections = plan === null
    ? assessment.sections
    : plan.moduleIds.map((moduleId) => assessment.sections.find((section) => section.id === moduleId)!).filter(Boolean);
  const selectedModules = sections.map((section) => section.id as EsatModuleId);
  const fullMockEntries: readonly PracticeEntry[] = selectedModules.map((moduleId) => {
    const mock = fullMockByModule[moduleId];
    return {
      id: mock.paperId,
      to: `/practice/${mock.paperId}`,
      kicker: `FULL MOCK · ${mock.range}`,
      title: mock.label,
      subtitle: mock.labelZh,
      meta: "27 questions · 40 minutes",
      ariaLabel: `${mock.label} full mock, 27 questions, 40 minutes. Start.`,
    };
  });
  const historicCatalog = publicHistoricPracticeForExam("esat");
  const historicalByModule = selectedModules.map((moduleId) => {
    const section = assessment.sections.find((candidate) => candidate.id === moduleId)!;
    const entries: readonly PracticeEntry[] = historicCatalog
      .filter((entry) => entry.moduleId === moduleId)
      .map((entry) => ({
        id: entry.paperId,
        to: entry.route,
        kicker: `HISTORICAL PAPER · ${section.label.toUpperCase()}`,
        title: `${entry.family} ${entry.year}`,
        subtitle: entry.titleZh.replace(/^NSAA \d{4} · /u, ""),
        meta: `${entry.questionCount} questions · ${entry.durationMinutes} minutes`,
        ariaLabel: `${entry.family} ${entry.year}, ${section.label}, ${entry.questionCount} questions. Start.`,
      }));
    return { section, entries };
  });
  const historicalCount = historicalByModule.reduce((total, group) => total + group.entries.length, 0);

  return (
    <main className="tmua-stage-page esat-stage-page assessment-library-page">
      <SiteHeader examId="esat" />
      <PracticeLibraryHero
        exam="ESAT"
        title={plan === null ? "Choose your programme first" : "Choose a full practice paper"}
        titleZh={plan === null ? "先选择申请专业" : "选择完整练习试卷"}
        summary={plan === null
          ? "Your university course determines which ESAT modules you need."
          : `Your modules: ${plan.moduleIds.map((id) => ESAT_MODULE_LABELS[id]).join(" · ")}`}
        summaryZh={plan === null ? "系统会根据学校与专业确定考试模块。" : "以下内容已按你的考试模块筛选。"}
        facts={plan === null
          ? ["Programme-based module selection", "No AI token required"]
          : [`${sections.length} required modules`, `${fullMockEntries.length} full mocks`, `${historicalCount} historical module papers`]}
        action={(
          <Link className="practice-library-hero__action" to="/exams/esat">
            <span>{plan === null ? "Choose programme" : "Change programme or modules"}</span>
            <small>{plan === null ? "选择专业" : "修改专业或模块"}</small>
          </Link>
        )}
      />

      {plan !== null && (
        <>
          <PracticeEntrySection
            eyebrow="FULL MOCKS"
            title="Full Mocks"
            titleZh="完整模考"
            summary={`${fullMockEntries.length} complete module papers`}
            entries={fullMockEntries}
          />
          {historicalByModule.map(({ section, entries }) => entries.length === 0 ? (
            <section className="practice-module-availability page-shell" key={section.id}>
              <div>
                <p>HISTORICAL PAPERS</p>
                <h2 lang="en">{section.label}<small lang="zh-CN">{section.labelZh}</small></h2>
              </div>
              <p lang="en">No legacy paper maps directly to this current module. Use the full mock above.</p>
              <small lang="zh-CN">暂无可直接对应现行模块的历年卷，请使用上方完整模考。</small>
            </section>
          ) : (
            <PracticeEntrySection
              key={section.id}
              eyebrow="HISTORICAL PAPERS"
              title={section.label}
              titleZh={section.labelZh}
              summary={`${entries.length} complete module papers · NSAA 2021–2023`}
              entries={entries}
            />
          ))}
        </>
      )}
    </main>
  );
}
