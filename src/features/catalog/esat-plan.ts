import rawKnowledgeUnits from "../../../content/esat/knowledge-units.json" with { type: "json" };
import {
  ESAT_ADMISSIONS_REGISTRY,
  ESAT_MODULE_IDS,
  ESAT_MODULE_LABELS,
  resolveEsatProgrammeSelection,
  type EsatModuleId,
} from "./esat-admissions.js";

export type EsatCurriculumId = "a-level" | "ib" | "ap";

export type EsatKnowledgeUnitStatus = "covered" | "partial" | "not-evidenced";

export interface EsatKnowledgeUnit {
  readonly id: string;
  readonly code: string;
  readonly label: string;
  readonly labelEn: string;
}

function loadKnowledgeUnits(): Readonly<Record<EsatModuleId, readonly EsatKnowledgeUnit[]>> {
  const result = new Map<EsatModuleId, readonly EsatKnowledgeUnit[]>();
  const allIds = new Set<string>();

  for (const module of rawKnowledgeUnits.modules) {
    if (!(ESAT_MODULE_IDS as readonly string[]).includes(module.id)) {
      throw new Error(`Unknown ESAT knowledge-unit module: ${module.id}`);
    }
    if (result.has(module.id as EsatModuleId) || module.units.length === 0) {
      throw new Error(`Invalid ESAT knowledge-unit module: ${module.id}`);
    }
    for (const unit of module.units) {
      if (!unit.id || !unit.code || !unit.label || !unit.labelEn || allIds.has(unit.id)) {
        throw new Error(`Invalid ESAT knowledge unit: ${unit.id}`);
      }
      allIds.add(unit.id);
    }
    result.set(module.id as EsatModuleId, module.units);
  }

  if (!ESAT_MODULE_IDS.every((moduleId) => result.has(moduleId))) {
    throw new Error("ESAT knowledge-unit registry is incomplete");
  }

  return Object.fromEntries(ESAT_MODULE_IDS.map((moduleId) => [moduleId, result.get(moduleId)!])) as Readonly<
    Record<EsatModuleId, readonly EsatKnowledgeUnit[]>
  >;
}

export const ESAT_KNOWLEDGE_UNITS = loadKnowledgeUnits();

type CourseUnitStatus = Exclude<EsatKnowledgeUnitStatus, "not-evidenced">;

function markUnits(
  covered: readonly string[] = [],
  partial: readonly string[] = [],
): Readonly<Record<string, CourseUnitStatus>> {
  return Object.fromEntries([
    ...covered.map((id) => [id, "covered"] as const),
    ...partial.map((id) => [id, "partial"] as const),
  ]);
}

function allUnits(moduleId: EsatModuleId, status: CourseUnitStatus = "covered"): Readonly<Record<string, CourseUnitStatus>> {
  return Object.fromEntries(ESAT_KNOWLEDGE_UNITS[moduleId].map((unit) => [unit.id, status]));
}

export interface EsatCourseOption {
  readonly id: string;
  readonly label: string;
  readonly curriculumId: EsatCurriculumId;
  readonly unitCoverage: Readonly<Record<string, CourseUnitStatus>>;
}

export const ESAT_CURRICULA: readonly {
  readonly id: EsatCurriculumId;
  readonly label: string;
  readonly detail: string;
}[] = [
  { id: "a-level", label: "A-Level / IAL", detail: "英国或国际 A-Level 课程" },
  { id: "ib", label: "IB Diploma", detail: "选择具体 HL / SL 科目" },
  { id: "ap", label: "AP", detail: "选择已经完成或正在学习的 AP 科目" },
];

export const ESAT_COURSES: readonly EsatCourseOption[] = [
  { id: "al-mathematics", label: "Mathematics", curriculumId: "a-level", unitCoverage: { ...allUnits("mathematics-1"), ...allUnits("mathematics-2") } },
  { id: "al-further-mathematics", label: "Further Mathematics", curriculumId: "a-level", unitCoverage: { ...allUnits("mathematics-1"), ...allUnits("mathematics-2") } },
  { id: "al-physics", label: "Physics", curriculumId: "a-level", unitCoverage: allUnits("physics") },
  { id: "al-chemistry", label: "Chemistry", curriculumId: "a-level", unitCoverage: allUnits("chemistry") },
  { id: "al-biology", label: "Biology", curriculumId: "a-level", unitCoverage: allUnits("biology") },
  { id: "ib-math-aa-hl", label: "Mathematics: Analysis & Approaches HL", curriculumId: "ib", unitCoverage: { ...allUnits("mathematics-1"), ...allUnits("mathematics-2"), ...markUnits([], ["m2-coordinate-geometry"]) } },
  { id: "ib-math-aa-sl", label: "Mathematics: Analysis & Approaches SL", curriculumId: "ib", unitCoverage: markUnits(["m1-number", "m1-ratio", "m1-algebra"], ["m1-units", "m1-geometry", "m1-statistics", "m1-probability", "m2-algebra-functions", "m2-trigonometry", "m2-exponentials-logs", "m2-differentiation", "m2-integration", "m2-graphs"]) },
  { id: "ib-math-ai-hl", label: "Mathematics: Applications & Interpretation HL", curriculumId: "ib", unitCoverage: markUnits(["m1-number", "m1-ratio", "m1-algebra", "m1-statistics", "m1-probability"], ["m1-units", "m1-geometry", "m2-algebra-functions", "m2-sequences-series", "m2-coordinate-geometry", "m2-trigonometry", "m2-exponentials-logs", "m2-differentiation", "m2-integration", "m2-graphs"]) },
  { id: "ib-math-ai-sl", label: "Mathematics: Applications & Interpretation SL", curriculumId: "ib", unitCoverage: markUnits(["m1-number", "m1-ratio", "m1-statistics", "m1-probability"], ["m1-units", "m1-algebra", "m1-geometry", "m2-algebra-functions", "m2-coordinate-geometry", "m2-trigonometry", "m2-exponentials-logs", "m2-graphs"]) },
  { id: "ib-physics-hl", label: "Physics HL", curriculumId: "ib", unitCoverage: allUnits("physics") },
  { id: "ib-physics-sl", label: "Physics SL", curriculumId: "ib", unitCoverage: allUnits("physics", "partial") },
  { id: "ib-chemistry-hl", label: "Chemistry HL", curriculumId: "ib", unitCoverage: allUnits("chemistry") },
  { id: "ib-chemistry-sl", label: "Chemistry SL", curriculumId: "ib", unitCoverage: allUnits("chemistry", "partial") },
  { id: "ib-biology-hl", label: "Biology HL", curriculumId: "ib", unitCoverage: allUnits("biology") },
  { id: "ib-biology-sl", label: "Biology SL", curriculumId: "ib", unitCoverage: allUnits("biology", "partial") },
  { id: "ap-precalculus", label: "AP Precalculus", curriculumId: "ap", unitCoverage: markUnits(["m1-number", "m1-ratio", "m1-algebra"], ["m1-units", "m1-geometry", "m2-algebra-functions", "m2-sequences-series", "m2-coordinate-geometry", "m2-trigonometry", "m2-exponentials-logs", "m2-graphs"]) },
  { id: "ap-calculus-ab", label: "AP Calculus AB", curriculumId: "ap", unitCoverage: markUnits(["m1-algebra", "m2-differentiation", "m2-integration", "m2-graphs"], ["m1-number", "m1-ratio", "m1-geometry", "m2-algebra-functions", "m2-trigonometry", "m2-exponentials-logs"]) },
  { id: "ap-calculus-bc", label: "AP Calculus BC", curriculumId: "ap", unitCoverage: markUnits(["m1-algebra", "m2-algebra-functions", "m2-sequences-series", "m2-trigonometry", "m2-exponentials-logs", "m2-differentiation", "m2-integration", "m2-graphs"], ["m1-number", "m1-ratio", "m1-geometry", "m2-coordinate-geometry"]) },
  { id: "ap-statistics", label: "AP Statistics", curriculumId: "ap", unitCoverage: markUnits(["m1-statistics", "m1-probability"]) },
  { id: "ap-physics-1", label: "AP Physics 1", curriculumId: "ap", unitCoverage: markUnits(["physics-mechanics"], ["physics-matter", "physics-waves"]) },
  { id: "ap-physics-2", label: "AP Physics 2", curriculumId: "ap", unitCoverage: markUnits(["physics-electricity", "physics-magnetism", "physics-thermal", "physics-waves"], ["physics-mechanics", "physics-matter", "physics-radioactivity"]) },
  { id: "ap-physics-c", label: "AP Physics C（未区分模块）", curriculumId: "ap", unitCoverage: markUnits([], ["physics-electricity", "physics-magnetism", "physics-mechanics"]) },
  { id: "ap-physics-c-mechanics", label: "AP Physics C: Mechanics", curriculumId: "ap", unitCoverage: markUnits(["physics-mechanics"]) },
  { id: "ap-physics-c-em", label: "AP Physics C: Electricity and Magnetism", curriculumId: "ap", unitCoverage: markUnits(["physics-electricity", "physics-magnetism"]) },
  { id: "ap-chemistry", label: "AP Chemistry", curriculumId: "ap", unitCoverage: markUnits(["chem-atomic", "chem-periodic", "chem-equations", "chem-quantitative", "chem-redox", "chem-bonding", "chem-acids", "chem-rates", "chem-energetics", "chem-electrolysis", "chem-particles"], ["chem-groups", "chem-separation", "chem-organic", "chem-metals", "chem-tests", "chem-air-water"]) },
  { id: "ap-biology", label: "AP Biology", curriculumId: "ap", unitCoverage: markUnits(["bio-cells", "bio-membranes", "bio-division", "bio-inheritance", "bio-dna", "bio-gene-tech", "bio-variation", "bio-enzymes", "bio-ecosystems"], ["bio-animal", "bio-plants"]) },
];

export interface EsatPreparationPlan {
  readonly schemaVersion: 1;
  readonly programmeIds: readonly string[];
  readonly moduleIds: readonly EsatModuleId[];
  readonly entryCycle: "2027" | "2028";
  readonly curriculumId: EsatCurriculumId | null;
  readonly courseIds: readonly string[];
  readonly updatedAt: string;
}

export interface BrowserStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "admission-test-breaker.esat-plan.v1";
const programmeIds = new Set(ESAT_ADMISSIONS_REGISTRY.programmes.map((programme) => programme.id));
const courseById = new Map(ESAT_COURSES.map((course) => [course.id, course]));

function sameModules(left: readonly EsatModuleId[], right: readonly EsatModuleId[]): boolean {
  return left.length === right.length && left.every((moduleId) => right.includes(moduleId));
}

export function createEsatPreparationPlan(
  value: Omit<EsatPreparationPlan, "schemaVersion">,
): EsatPreparationPlan {
  if (value.programmeIds.length === 0 || new Set(value.programmeIds).size !== value.programmeIds.length) {
    throw new Error("At least one unique ESAT programme is required");
  }
  if (!value.programmeIds.every((id) => programmeIds.has(id))) {
    throw new Error("ESAT preparation plan contains an unknown programme");
  }
  const resolution = resolveEsatProgrammeSelection(value.programmeIds);
  if (resolution.status === "conflict" || !resolution.options.some((option) => sameModules(option, value.moduleIds))) {
    throw new Error("ESAT modules do not satisfy the selected programmes");
  }
  if (value.entryCycle !== "2027" && value.entryCycle !== "2028") {
    throw new Error("ESAT entry cycle is unsupported");
  }
  if (value.curriculumId === null && value.courseIds.length > 0) {
    throw new Error("ESAT courses require a curriculum");
  }
  if (value.curriculumId !== null) {
    if (new Set(value.courseIds).size !== value.courseIds.length || value.courseIds.length === 0) {
      throw new Error("At least one unique ESAT course is required");
    }
    if (!value.courseIds.every((id) => courseById.get(id)?.curriculumId === value.curriculumId)) {
      throw new Error("ESAT course does not belong to the selected curriculum");
    }
  }
  if (!Number.isFinite(Date.parse(value.updatedAt))) {
    throw new Error("ESAT preparation plan timestamp is invalid");
  }
  return { schemaVersion: 1, ...value };
}

export function loadEsatPreparationPlan(storage: BrowserStorage): EsatPreparationPlan | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const value = JSON.parse(raw) as Partial<EsatPreparationPlan>;
    if (
      value.schemaVersion !== 1 ||
      !Array.isArray(value.programmeIds) ||
      !Array.isArray(value.moduleIds) ||
      !Array.isArray(value.courseIds) ||
      typeof value.updatedAt !== "string"
    ) return null;
    return createEsatPreparationPlan({
      programmeIds: value.programmeIds as string[],
      moduleIds: value.moduleIds.filter((id): id is EsatModuleId =>
        typeof id === "string" && (ESAT_MODULE_IDS as readonly string[]).includes(id),
      ),
      entryCycle: value.entryCycle as "2027" | "2028",
      curriculumId: value.curriculumId as EsatCurriculumId | null,
      courseIds: value.courseIds as string[],
      updatedAt: value.updatedAt,
    });
  } catch {
    return null;
  }
}

export function saveEsatPreparationPlan(storage: BrowserStorage, plan: EsatPreparationPlan): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

export function coursesForCurriculum(curriculumId: EsatCurriculumId): readonly EsatCourseOption[] {
  return ESAT_COURSES.filter((course) => course.curriculumId === curriculumId);
}

export type EsatCoverageStatus = "covered" | "partial" | "not-evidenced";

export interface EsatUnitCoverageResult extends EsatKnowledgeUnit {
  readonly status: EsatKnowledgeUnitStatus;
  readonly evidence: readonly string[];
}

export interface EsatCoverageResult {
  readonly moduleId: EsatModuleId;
  readonly label: string;
  readonly status: EsatCoverageStatus;
  readonly evidence: readonly string[];
  readonly units: readonly EsatUnitCoverageResult[];
  readonly coveredUnits: readonly EsatUnitCoverageResult[];
  readonly partialUnits: readonly EsatUnitCoverageResult[];
  readonly missingUnits: readonly EsatUnitCoverageResult[];
}

export function buildEsatCoverage(plan: EsatPreparationPlan): readonly EsatCoverageResult[] {
  const courses = plan.courseIds.map((id) => courseById.get(id)).filter((course): course is EsatCourseOption => course !== undefined);
  return plan.moduleIds.map((moduleId) => {
    const units = ESAT_KNOWLEDGE_UNITS[moduleId].map((unit): EsatUnitCoverageResult => {
      const direct = courses.filter((course) => course.unitCoverage[unit.id] === "covered");
      const partial = courses.filter((course) => course.unitCoverage[unit.id] === "partial");
      return {
        ...unit,
        status: direct.length > 0 ? "covered" : partial.length > 0 ? "partial" : "not-evidenced",
        evidence: [...direct, ...partial].map((course) => course.label),
      };
    });
    const coveredUnits = units.filter((unit) => unit.status === "covered");
    const partialUnits = units.filter((unit) => unit.status === "partial");
    const missingUnits = units.filter((unit) => unit.status === "not-evidenced");
    const evidence = [...new Set(units.flatMap((unit) => unit.evidence))];
    return {
      moduleId,
      label: ESAT_MODULE_LABELS[moduleId],
      status: coveredUnits.length === units.length
        ? "covered"
        : coveredUnits.length === 0 && partialUnits.length === 0
          ? "not-evidenced"
          : "partial",
      evidence,
      units,
      coveredUnits,
      partialUnits,
      missingUnits,
    };
  });
}
