import { useMemo } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "../../navigation/components/SiteHeader.js";
import { getAssessmentDefinition } from "../../practice/catalog/assessment-registry.js";
import {
  PracticeEntrySection,
  PracticeLibraryHero,
  type PracticeEntry,
} from "../components/PracticeLibrary.js";
import { ESAT_MODULE_LABELS, type EsatModuleId } from "../esat-admissions.js";
import { loadEsatPreparationPlan } from "../esat-plan.js";

const starterByModule: Readonly<Record<EsatModuleId, { readonly paperId: string; readonly focusCount: number }>> = {
  "mathematics-1": { paperId: "esat-mathematics-1-starter-v1", focusCount: 7 },
  "mathematics-2": { paperId: "esat-mathematics-2-starter-v1", focusCount: 8 },
  physics: { paperId: "esat-physics-starter-v1", focusCount: 7 },
  chemistry: { paperId: "esat-chemistry-starter-v1", focusCount: 13 },
  biology: { paperId: "esat-biology-starter-v1", focusCount: 11 },
};

const fullMockByModule: Readonly<Partial<Record<EsatModuleId, {
  readonly paperId: string;
  readonly label: string;
  readonly labelZh: string;
  readonly range: string;
}>>> = {
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
  const fullMocks = sections.flatMap((section) => {
    const mock = fullMockByModule[section.id as EsatModuleId];
    return mock === undefined ? [] : [mock];
  });
  const fullMockEntries: readonly PracticeEntry[] = fullMocks.map((mock) => ({
    id: mock.paperId,
    to: `/practice/${mock.paperId}`,
    kicker: `FULL MOCK · ${mock.range}`,
    title: mock.label,
    subtitle: mock.labelZh,
    meta: "27 题 · 40 分钟",
    ariaLabel: `${mock.label} ${mock.labelZh}，27 题，40 分钟，开始完整模考`,
  }));
  const diagnosticEntries: readonly PracticeEntry[] = sections.map((section) => ({
    id: starterByModule[section.id as EsatModuleId].paperId,
    to: `/practice/${starterByModule[section.id as EsatModuleId].paperId}`,
    kicker: "SHORT DIAGNOSTIC",
    title: section.label,
    subtitle: section.labelZh,
    meta: "10 题 · 建议 20 分钟",
    kind: "diagnostic",
    ariaLabel: `${section.label} ${section.labelZh}，10 题短诊断，开始练习`,
  }));

  return (
    <main className="tmua-stage-page esat-stage-page assessment-library-page">
      <SiteHeader examId="esat" />
      <PracticeLibraryHero
        exam="ESAT"
        title={plan === null ? "先确定你的考试模块" : "选择一个模块开始"}
        titleEn={plan === null ? "Find your required modules" : "Choose a module"}
        summary={plan === null
          ? "选择学校和专业，系统会给出对应模块。"
          : `你的模块：${plan.moduleIds.map((id) => ESAT_MODULE_LABELS[id]).join(" · ")}`}
        facts={plan === null
          ? ["按专业筛选", "无需 AI Token"]
          : [`${sections.length} 个必考模块`, `${fullMockEntries.length} 套完整模考`, `${diagnosticEntries.length} 套短诊断`]}
        action={<Link className="practice-library-hero__action" to="/exams/esat">{plan === null ? "选择学校和专业" : "修改专业与模块"}</Link>}
      />

      {plan !== null && (
        <>
          {fullMockEntries.length === 0 ? null : (
            <PracticeEntrySection
              eyebrow="FULL MOCKS"
              title="完整模考"
              titleEn="Full-length practice"
              summary={`${fullMockEntries.length} 套 · 每套 27 题 / 40 分钟`}
              entries={fullMockEntries}
            />
          )}
          <PracticeEntrySection
            eyebrow="SHORT DIAGNOSTICS"
            title="短诊断"
            titleEn="Check your starting point"
            summary={`${diagnosticEntries.length} 套 · 每套 10 题`}
            entries={diagnosticEntries}
          />
        </>
      )}

    </main>
  );
}
