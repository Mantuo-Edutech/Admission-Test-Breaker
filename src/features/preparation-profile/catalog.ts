export type CurriculumSystemId = "caie" | "pearson-ial" | "ib" | "ap";

export interface CurriculumUnitOption {
  readonly id: string;
  readonly label: string;
  readonly requirement: "compulsory" | "optional" | "pathway";
}

export interface QualificationOption {
  readonly id: string;
  readonly system: CurriculumSystemId;
  readonly label: string;
  readonly specificationVersion: string;
  readonly sourceRegistryId: "caie" | "pearson-ial" | "ibo" | "college-board";
  readonly sourceDocument: string;
  readonly units: readonly CurriculumUnitOption[];
  readonly certificationRules?: readonly string[];
}

export const PREPARATION_CATALOG: readonly QualificationOption[] = [
  {
    id: "caie-9709-2026-2027",
    system: "caie",
    label: "Cambridge International AS & A Level Mathematics (9709)",
    specificationVersion: "2026-2027",
    sourceRegistryId: "caie",
    sourceDocument:
      "research/official-sources/files/caie/9709-mathematics-syllabus-2026-2027.pdf",
    units: [
      { id: "p1", label: "Paper 1 · Pure Mathematics 1", requirement: "pathway" },
      { id: "p2", label: "Paper 2 · Pure Mathematics 2", requirement: "pathway" },
      { id: "p3", label: "Paper 3 · Pure Mathematics 3", requirement: "pathway" },
      { id: "m1", label: "Paper 4 · Mechanics", requirement: "pathway" },
      {
        id: "s1",
        label: "Paper 5 · Probability & Statistics 1",
        requirement: "pathway",
      },
      {
        id: "s2",
        label: "Paper 6 · Probability & Statistics 2",
        requirement: "pathway",
      },
    ],
  },
  {
    id: "caie-9231-2026-2027",
    system: "caie",
    label: "Cambridge International AS & A Level Further Mathematics (9231)",
    specificationVersion: "2026-2027",
    sourceRegistryId: "caie",
    sourceDocument:
      "research/official-sources/files/caie/9231-further-mathematics-syllabus-2026-2027.pdf",
    units: [
      {
        id: "fp1",
        label: "Paper 1 · Further Pure Mathematics 1",
        requirement: "pathway",
      },
      {
        id: "fp2",
        label: "Paper 2 · Further Pure Mathematics 2",
        requirement: "pathway",
      },
      {
        id: "fm",
        label: "Paper 3 · Further Mechanics",
        requirement: "pathway",
      },
      {
        id: "fps",
        label: "Paper 4 · Further Probability & Statistics",
        requirement: "pathway",
      },
    ],
  },
  {
    id: "pearson-ial-mathematics-issue-3",
    system: "pearson-ial",
    label: "Pearson Edexcel International A Level Mathematics",
    specificationVersion: "Issue 3 - April 2019",
    sourceRegistryId: "pearson-ial",
    sourceDocument:
      "research/official-sources/files/pearson-ial/mathematics-specification-2018-current.pdf",
    units: [
      { id: "p1", label: "P1 · Pure Mathematics 1", requirement: "compulsory" },
      { id: "p2", label: "P2 · Pure Mathematics 2", requirement: "compulsory" },
      { id: "p3", label: "P3 · Pure Mathematics 3", requirement: "compulsory" },
      { id: "p4", label: "P4 · Pure Mathematics 4", requirement: "compulsory" },
      { id: "m1", label: "M1 · Mechanics 1", requirement: "optional" },
      { id: "m2", label: "M2 · Mechanics 2", requirement: "optional" },
      { id: "s1", label: "S1 · Statistics 1", requirement: "optional" },
      { id: "s2", label: "S2 · Statistics 2", requirement: "optional" },
      { id: "d1", label: "D1 · Decision Mathematics 1", requirement: "optional" },
    ],
    certificationRules: [
      "P1, P2, P3 and P4 are compulsory.",
      "Choose M1+S1, M1+D1, M1+M2, S1+D1 or S1+S2 for IAL certification.",
    ],
  },
  {
    id: "pearson-ial-further-mathematics-issue-3",
    system: "pearson-ial",
    label: "Pearson Edexcel International A Level Further Mathematics",
    specificationVersion: "Issue 3 - April 2019",
    sourceRegistryId: "pearson-ial",
    sourceDocument:
      "research/official-sources/files/pearson-ial/mathematics-specification-2018-current.pdf",
    units: [
      { id: "fp1", label: "FP1 · Further Pure Mathematics 1", requirement: "compulsory" },
      { id: "fp2", label: "FP2 · Further Pure Mathematics 2", requirement: "pathway" },
      { id: "fp3", label: "FP3 · Further Pure Mathematics 3", requirement: "pathway" },
      { id: "m1", label: "M1 · Mechanics 1", requirement: "optional" },
      { id: "m2", label: "M2 · Mechanics 2", requirement: "optional" },
      { id: "m3", label: "M3 · Mechanics 3", requirement: "optional" },
      { id: "s1", label: "S1 · Statistics 1", requirement: "optional" },
      { id: "s2", label: "S2 · Statistics 2", requirement: "optional" },
      { id: "s3", label: "S3 · Statistics 3", requirement: "optional" },
      { id: "d1", label: "D1 · Decision Mathematics 1", requirement: "optional" },
    ],
    certificationRules: [
      "FP1 and either FP2 or FP3 are compulsory.",
      "A total of six different units is required for IAL certification.",
    ],
  },
  {
    id: "ib-aa-sl-first-assessment-2021",
    system: "ib",
    label: "IB Mathematics: Analysis & Approaches SL · 分析与方法 SL",
    specificationVersion: "First assessment 2021",
    sourceRegistryId: "ibo",
    sourceDocument:
      "https://ibo.org/contentassets/5895a05412144fe890312bad52b17044/subject-brief-dp-math-analysis-and-approaches-en.pdf",
    units: ibMathematicsUnits(),
  },
  {
    id: "ib-aa-hl-first-assessment-2021",
    system: "ib",
    label: "IB Mathematics: Analysis & Approaches HL · 分析与方法 HL",
    specificationVersion: "First assessment 2021",
    sourceRegistryId: "ibo",
    sourceDocument:
      "https://ibo.org/contentassets/5895a05412144fe890312bad52b17044/subject-brief-dp-math-analysis-and-approaches-en.pdf",
    units: ibMathematicsUnits(),
  },
  {
    id: "ib-ai-sl-first-assessment-2021",
    system: "ib",
    label: "IB Mathematics: Applications & Interpretation SL · 应用与解释 SL",
    specificationVersion: "First assessment 2021",
    sourceRegistryId: "ibo",
    sourceDocument:
      "https://ibo.org/contentassets/40de1280e31f4cd582b96d9ffd7e31f2/subject-brief-dp-math-applications-and-interpretations-en.pdf",
    units: ibMathematicsUnits(),
  },
  {
    id: "ib-ai-hl-first-assessment-2021",
    system: "ib",
    label: "IB Mathematics: Applications & Interpretation HL · 应用与解释 HL",
    specificationVersion: "First assessment 2021",
    sourceRegistryId: "ibo",
    sourceDocument:
      "https://ibo.org/contentassets/40de1280e31f4cd582b96d9ffd7e31f2/subject-brief-dp-math-applications-and-interpretations-en.pdf",
    units: ibMathematicsUnits(),
  },
  {
    id: "ap-precalculus-effective-fall-2026",
    system: "ap",
    label: "AP Precalculus · AP 预备微积分",
    specificationVersion: "Effective Fall 2026",
    sourceRegistryId: "college-board",
    sourceDocument:
      "https://apcentral.collegeboard.org/media/pdf/ap-precalculus-course-and-exam-description.pdf",
    units: [
      { id: "u1", label: "Unit 1 · Polynomial & Rational Functions · 多项式与有理函数", requirement: "compulsory" },
      { id: "u2", label: "Unit 2 · Exponential & Logarithmic Functions · 指数与对数函数", requirement: "compulsory" },
      { id: "u3", label: "Unit 3 · Trigonometric & Polar Functions · 三角与极坐标函数", requirement: "compulsory" },
      { id: "u4", label: "Unit 4 · Parameters, Vectors & Matrices · 参数、向量与矩阵", requirement: "optional" },
    ],
  },
  {
    id: "ap-calculus-ab-2020-current",
    system: "ap",
    label: "AP Calculus AB · AP 微积分 AB",
    specificationVersion: "CED 2020 · current framework",
    sourceRegistryId: "college-board",
    sourceDocument:
      "https://apcentral.collegeboard.org/media/pdf/ap-calculus-ab-and-bc-course-and-exam-description.pdf",
    units: apCalculusUnits(false),
  },
  {
    id: "ap-calculus-bc-2020-current",
    system: "ap",
    label: "AP Calculus BC · AP 微积分 BC",
    specificationVersion: "CED 2020 · current framework",
    sourceRegistryId: "college-board",
    sourceDocument:
      "https://apcentral.collegeboard.org/media/pdf/ap-calculus-ab-and-bc-course-and-exam-description.pdf",
    units: apCalculusUnits(true),
  },
];

function ibMathematicsUnits(): readonly CurriculumUnitOption[] {
  return [
    { id: "number-algebra", label: "Number & Algebra · 数与代数", requirement: "compulsory" },
    { id: "functions", label: "Functions · 函数", requirement: "compulsory" },
    { id: "geometry-trigonometry", label: "Geometry & Trigonometry · 几何与三角", requirement: "compulsory" },
    { id: "statistics-probability", label: "Statistics & Probability · 统计与概率", requirement: "compulsory" },
    { id: "calculus", label: "Calculus · 微积分", requirement: "compulsory" },
  ];
}

function apCalculusUnits(includeBcOnly: boolean): readonly CurriculumUnitOption[] {
  const common: CurriculumUnitOption[] = [
    { id: "u1", label: "Unit 1 · Limits & Continuity · 极限与连续", requirement: "compulsory" },
    { id: "u2", label: "Unit 2 · Differentiation: Definition & Fundamental Properties · 微分定义与基本性质", requirement: "compulsory" },
    { id: "u3", label: "Unit 3 · Composite, Implicit & Inverse Functions · 复合、隐函数与反函数微分", requirement: "compulsory" },
    { id: "u4", label: "Unit 4 · Contextual Applications of Differentiation · 微分的情境应用", requirement: "compulsory" },
    { id: "u5", label: "Unit 5 · Analytical Applications of Differentiation · 微分的分析应用", requirement: "compulsory" },
    { id: "u6", label: "Unit 6 · Integration & Accumulation of Change · 积分与变化累积", requirement: "compulsory" },
    { id: "u7", label: "Unit 7 · Differential Equations · 微分方程", requirement: "compulsory" },
    { id: "u8", label: "Unit 8 · Applications of Integration · 积分应用", requirement: "compulsory" },
  ];
  if (!includeBcOnly) return common;
  return [
    ...common,
    { id: "u9", label: "Unit 9 · Parametric, Polar & Vector-Valued Functions · 参数、极坐标与向量函数", requirement: "compulsory" },
    { id: "u10", label: "Unit 10 · Infinite Sequences & Series · 无穷数列与级数", requirement: "compulsory" },
  ];
}

export function qualificationsForSystem(
  system: CurriculumSystemId,
): readonly QualificationOption[] {
  return PREPARATION_CATALOG.filter((qualification) => qualification.system === system);
}

export function qualificationById(id: string): QualificationOption | null {
  return PREPARATION_CATALOG.find((qualification) => qualification.id === id) ?? null;
}
