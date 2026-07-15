import { qualificationById } from "./catalog.js";
import type { PreparationProfile } from "./domain.js";

export type CourseCoverageStatus = "direct" | "related" | "not-evidenced";

export interface BilingualStudyTopic {
  readonly zh: string;
  readonly en: string;
}

export interface StudyTimeRange {
  readonly min: number;
  readonly max: number;
}

export interface CourseCoverageDomain {
  readonly id: string;
  readonly label: string;
  readonly labelEn: string;
  readonly scope: "paper-1-and-2" | "paper-2" | "support";
  readonly status: CourseCoverageStatus;
  readonly evidence: readonly string[];
  readonly studyTopics: readonly BilingualStudyTopic[];
  readonly reviewMinutes: StudyTimeRange;
  readonly gapCheckMinutes: StudyTimeRange;
  readonly foundationHours: StudyTimeRange;
}

export interface CourseCoverageReport {
  readonly mappingVersion: "2026-07-14.1";
  readonly directCount: number;
  readonly relatedCount: number;
  readonly notEvidencedCount: number;
  readonly notEvidencedFoundationHours: StudyTimeRange;
  readonly domains: readonly CourseCoverageDomain[];
}

type CoverageDomainId = CourseCoverageDomain["id"];
type MappingStrength = Exclude<CourseCoverageStatus, "not-evidenced">;

interface UnitCoverageMapping {
  readonly qualificationId: string;
  readonly unitId: string;
  readonly domains: Readonly<Partial<Record<CoverageDomainId, MappingStrength>>>;
}

const D = "direct" as const;
const R = "related" as const;

const DOMAINS: readonly Omit<CourseCoverageDomain, "status" | "evidence">[] = [
  {
    id: "algebra-and-functions",
    label: "代数与函数",
    labelEn: "Algebra & Functions",
    scope: "paper-1-and-2",
    studyTopics: [
      { zh: "指数与根式", en: "Indices & Surds" },
      { zh: "二次式与不等式", en: "Quadratics & Inequalities" },
      { zh: "多项式、函数与映射", en: "Polynomials, Functions & Mappings" },
    ],
    reviewMinutes: { min: 60, max: 90 },
    gapCheckMinutes: { min: 45, max: 60 },
    foundationHours: { min: 4, max: 6 },
  },
  {
    id: "sequences-and-series",
    label: "数列与级数",
    labelEn: "Sequences & Series",
    scope: "paper-1-and-2",
    studyTopics: [
      { zh: "等差数列与求和", en: "Arithmetic Sequences & Sums" },
      { zh: "等比数列与无穷级数", en: "Geometric Sequences & Infinite Series" },
      { zh: "二项式展开", en: "Binomial Expansion" },
    ],
    reviewMinutes: { min: 45, max: 60 },
    gapCheckMinutes: { min: 30, max: 45 },
    foundationHours: { min: 2, max: 3 },
  },
  {
    id: "coordinate-geometry",
    label: "坐标几何",
    labelEn: "Coordinate Geometry",
    scope: "paper-1-and-2",
    studyTopics: [
      { zh: "直线、斜率与交点", en: "Lines, Gradients & Intersections" },
      { zh: "圆的方程", en: "Equations of Circles" },
      { zh: "距离、区域与几何条件", en: "Distances, Regions & Conditions" },
    ],
    reviewMinutes: { min: 45, max: 60 },
    gapCheckMinutes: { min: 30, max: 45 },
    foundationHours: { min: 2, max: 3 },
  },
  {
    id: "trigonometry",
    label: "三角函数",
    labelEn: "Trigonometry",
    scope: "paper-1-and-2",
    studyTopics: [
      { zh: "正弦定理与余弦定理", en: "Sine & Cosine Rules" },
      { zh: "弧度制", en: "Radian Measure" },
      { zh: "恒等式与三角方程", en: "Identities & Equations" },
    ],
    reviewMinutes: { min: 60, max: 90 },
    gapCheckMinutes: { min: 45, max: 60 },
    foundationHours: { min: 3, max: 5 },
  },
  {
    id: "exponentials-and-logarithms",
    label: "指数与对数",
    labelEn: "Exponentials & Logarithms",
    scope: "paper-1-and-2",
    studyTopics: [
      { zh: "指数与对数运算律", en: "Laws of Exponents & Logarithms" },
      { zh: "指数与对数图像", en: "Exponential & Logarithmic Graphs" },
      { zh: "方程与实际建模", en: "Equations & Modelling" },
    ],
    reviewMinutes: { min: 45, max: 60 },
    gapCheckMinutes: { min: 30, max: 45 },
    foundationHours: { min: 2, max: 3 },
  },
  {
    id: "differentiation",
    label: "微分",
    labelEn: "Differentiation",
    scope: "paper-1-and-2",
    studyTopics: [
      { zh: "导数与切线斜率", en: "Derivatives & Tangent Gradients" },
      { zh: "驻点与曲线特征", en: "Stationary Points & Curve Features" },
      { zh: "最优化", en: "Optimisation" },
    ],
    reviewMinutes: { min: 60, max: 90 },
    gapCheckMinutes: { min: 45, max: 60 },
    foundationHours: { min: 3, max: 5 },
  },
  {
    id: "integration",
    label: "积分",
    labelEn: "Integration",
    scope: "paper-1-and-2",
    studyTopics: [
      { zh: "不定积分", en: "Antiderivatives" },
      { zh: "定积分", en: "Definite Integrals" },
      { zh: "曲线下面积与几何解释", en: "Areas & Geometric Interpretation" },
    ],
    reviewMinutes: { min: 60, max: 90 },
    gapCheckMinutes: { min: 45, max: 60 },
    foundationHours: { min: 3, max: 5 },
  },
  {
    id: "graphs-of-functions",
    label: "函数图像",
    labelEn: "Graphs of Functions",
    scope: "paper-1-and-2",
    studyTopics: [
      { zh: "图像平移、伸缩与对称", en: "Transformations & Symmetry" },
      { zh: "交点、根与取值范围", en: "Intersections, Roots & Ranges" },
      { zh: "由图像判断函数性质", en: "Reading Function Behaviour" },
    ],
    reviewMinutes: { min: 45, max: 60 },
    gapCheckMinutes: { min: 30, max: 45 },
    foundationHours: { min: 2, max: 3 },
  },
  {
    id: "mathematical-reasoning",
    label: "数学逻辑、证明与论证",
    labelEn: "Mathematical Logic, Proof & Argument",
    scope: "paper-2",
    studyTopics: [
      { zh: "蕴含、逆命题与逆否命题", en: "Implication, Converse & Contrapositive" },
      { zh: "必要条件与充分条件", en: "Necessary & Sufficient Conditions" },
      { zh: "证明、反例与错误定位", en: "Proof, Counterexamples & Errors" },
    ],
    reviewMinutes: { min: 60, max: 90 },
    gapCheckMinutes: { min: 45, max: 60 },
    foundationHours: { min: 4, max: 6 },
  },
  {
    id: "supporting-knowledge",
    label: "GCSE / IGCSE 支撑知识",
    labelEn: "GCSE / IGCSE Supporting Knowledge",
    scope: "support",
    studyTopics: [
      { zh: "分数、比例、指数与根式", en: "Fractions, Ratios, Indices & Surds" },
      { zh: "方程、不等式与基础图像", en: "Equations, Inequalities & Basic Graphs" },
      { zh: "平面几何与概率基础", en: "Geometry & Probability Foundations" },
    ],
    reviewMinutes: { min: 45, max: 60 },
    gapCheckMinutes: { min: 30, max: 45 },
    foundationHours: { min: 3, max: 5 },
  },
];

const UNIT_MAPPINGS: readonly UnitCoverageMapping[] = [
  {
    qualificationId: "caie-9709-2026-2027",
    unitId: "p1",
    domains: {
      "algebra-and-functions": D,
      "sequences-and-series": D,
      "coordinate-geometry": D,
      trigonometry: D,
      differentiation: D,
      integration: D,
      "graphs-of-functions": D,
    },
  },
  {
    qualificationId: "caie-9709-2026-2027",
    unitId: "p2",
    domains: {
      "algebra-and-functions": D,
      "exponentials-and-logarithms": D,
      trigonometry: D,
      differentiation: D,
      integration: D,
    },
  },
  {
    qualificationId: "caie-9709-2026-2027",
    unitId: "p3",
    domains: {
      "algebra-and-functions": D,
      "exponentials-and-logarithms": D,
      trigonometry: D,
      differentiation: D,
      integration: D,
      "graphs-of-functions": R,
    },
  },
  {
    qualificationId: "caie-9231-2026-2027",
    unitId: "fp1",
    domains: {
      "algebra-and-functions": R,
      "sequences-and-series": R,
      "coordinate-geometry": R,
      "graphs-of-functions": R,
      "mathematical-reasoning": R,
    },
  },
  {
    qualificationId: "caie-9231-2026-2027",
    unitId: "fp2",
    domains: {
      "algebra-and-functions": R,
      differentiation: R,
      integration: R,
      "mathematical-reasoning": R,
    },
  },
  {
    qualificationId: "pearson-ial-mathematics-issue-3",
    unitId: "p1",
    domains: {
      "algebra-and-functions": D,
      "coordinate-geometry": D,
      trigonometry: D,
      differentiation: D,
      integration: D,
      "graphs-of-functions": D,
    },
  },
  {
    qualificationId: "pearson-ial-mathematics-issue-3",
    unitId: "p2",
    domains: {
      "algebra-and-functions": D,
      "sequences-and-series": D,
      "coordinate-geometry": D,
      trigonometry: D,
      "exponentials-and-logarithms": D,
      differentiation: D,
      integration: D,
      "mathematical-reasoning": R,
    },
  },
  {
    qualificationId: "pearson-ial-mathematics-issue-3",
    unitId: "p3",
    domains: {
      "algebra-and-functions": D,
      trigonometry: D,
      "exponentials-and-logarithms": D,
      differentiation: D,
      integration: D,
      "graphs-of-functions": R,
    },
  },
  {
    qualificationId: "pearson-ial-mathematics-issue-3",
    unitId: "p4",
    domains: {
      "algebra-and-functions": D,
      "coordinate-geometry": D,
      differentiation: D,
      integration: D,
      "mathematical-reasoning": R,
    },
  },
  {
    qualificationId: "pearson-ial-further-mathematics-issue-3",
    unitId: "fp1",
    domains: {
      "algebra-and-functions": R,
      "sequences-and-series": R,
      "coordinate-geometry": R,
      "graphs-of-functions": R,
      "mathematical-reasoning": R,
    },
  },
  {
    qualificationId: "pearson-ial-further-mathematics-issue-3",
    unitId: "fp2",
    domains: {
      "algebra-and-functions": R,
      trigonometry: R,
      differentiation: R,
      integration: R,
      "mathematical-reasoning": R,
    },
  },
  {
    qualificationId: "pearson-ial-further-mathematics-issue-3",
    unitId: "fp3",
    domains: {
      "algebra-and-functions": R,
      differentiation: R,
      integration: R,
      "mathematical-reasoning": R,
    },
  },
];

function strongest(
  current: CourseCoverageStatus,
  next: MappingStrength,
): CourseCoverageStatus {
  if (current === "direct" || next === "direct") return "direct";
  return "related";
}

export function buildCourseCoverageReport(
  profile: PreparationProfile,
): CourseCoverageReport {
  const evidence = new Map<CoverageDomainId, string[]>();
  const statuses = new Map<CoverageDomainId, CourseCoverageStatus>();

  for (const domain of DOMAINS) {
    evidence.set(domain.id, []);
    statuses.set(domain.id, "not-evidenced");
  }

  for (const selection of profile.selections) {
    const qualification = qualificationById(selection.qualificationId);
    if (qualification === null) continue;

    for (const unitId of selection.unitIds) {
      const mapping = UNIT_MAPPINGS.find(
        (item) =>
          item.qualificationId === selection.qualificationId && item.unitId === unitId,
      );
      if (mapping === undefined) continue;
      const unitLabel = qualification.units.find((unit) => unit.id === unitId)?.label ?? unitId;

      for (const [domainId, strength] of Object.entries(mapping.domains)) {
        if (strength === undefined) continue;
        const typedDomainId = domainId as CoverageDomainId;
        statuses.set(
          typedDomainId,
          strongest(statuses.get(typedDomainId) ?? "not-evidenced", strength),
        );
        evidence.get(typedDomainId)?.push(`${qualification.label} · ${unitLabel}`);
      }
    }
  }

  const domains = DOMAINS.map((domain) => ({
    ...domain,
    status: statuses.get(domain.id) ?? "not-evidenced",
    evidence: evidence.get(domain.id) ?? [],
  }));
  const notEvidencedFoundationHours = domains
    .filter((domain) => domain.status === "not-evidenced")
    .reduce(
      (total, domain) => ({
        min: total.min + domain.foundationHours.min,
        max: total.max + domain.foundationHours.max,
      }),
      { min: 0, max: 0 },
    );

  return {
    mappingVersion: "2026-07-14.1",
    directCount: domains.filter((domain) => domain.status === "direct").length,
    relatedCount: domains.filter((domain) => domain.status === "related").length,
    notEvidencedCount: domains.filter((domain) => domain.status === "not-evidenced").length,
    notEvidencedFoundationHours,
    domains,
  };
}
