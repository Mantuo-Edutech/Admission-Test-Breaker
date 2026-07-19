import rawRegistry from "../../../content/admissions/esat-2027.json" with { type: "json" };

export const ESAT_MODULE_IDS = [
  "mathematics-1",
  "biology",
  "chemistry",
  "physics",
  "mathematics-2",
] as const;

export type EsatModuleId = (typeof ESAT_MODULE_IDS)[number];

export const ESAT_MODULE_LABELS: Readonly<Record<EsatModuleId, string>> = {
  "mathematics-1": "Mathematics 1",
  biology: "Biology",
  chemistry: "Chemistry",
  physics: "Physics",
  "mathematics-2": "Mathematics 2",
};

export interface EsatInstitution {
  readonly id: string;
  readonly name: string;
  readonly ucasCode: string;
}

export interface EsatModuleRule {
  readonly required: readonly EsatModuleId[];
  readonly choose: number;
  readonly from: readonly EsatModuleId[];
  readonly totalModules: 2 | 3;
}

export interface EsatProgramme {
  readonly id: string;
  readonly institutionId: string;
  readonly name: string;
  readonly ucasCode: string;
  readonly rule: EsatModuleRule;
}

interface EsatAdmissionsRegistry {
  readonly schemaVersion: 1;
  readonly exam: "ESAT";
  readonly entryCycle: "2027";
  readonly verifiedAt: string;
  readonly source: {
    readonly publisher: string;
    readonly title: string;
    readonly lastUpdated: string;
    readonly url: string;
  };
  readonly institutions: readonly EsatInstitution[];
  readonly programmes: readonly EsatProgramme[];
}

function isModuleId(value: unknown): value is EsatModuleId {
  return typeof value === "string" && (ESAT_MODULE_IDS as readonly string[]).includes(value);
}

function validateRegistry(value: unknown): EsatAdmissionsRegistry {
  if (typeof value !== "object" || value === null) {
    throw new Error("ESAT admissions registry must be an object");
  }
  const candidate = value as Partial<EsatAdmissionsRegistry>;
  if (
    candidate.schemaVersion !== 1 ||
    candidate.exam !== "ESAT" ||
    candidate.entryCycle !== "2027" ||
    !Array.isArray(candidate.institutions) ||
    !Array.isArray(candidate.programmes)
  ) {
    throw new Error("ESAT admissions registry header is invalid");
  }

  const institutionIds = new Set(candidate.institutions.map((institution) => institution.id));
  if (institutionIds.size !== candidate.institutions.length) {
    throw new Error("ESAT institution ids must be unique");
  }

  const programmeIds = new Set<string>();
  for (const programme of candidate.programmes) {
    if (programmeIds.has(programme.id) || !institutionIds.has(programme.institutionId)) {
      throw new Error(`Invalid ESAT programme identity: ${programme.id}`);
    }
    programmeIds.add(programme.id);
    if (
      (programme.rule.totalModules !== 2 && programme.rule.totalModules !== 3) ||
      !programme.rule.required.every(isModuleId) ||
      !programme.rule.from.every(isModuleId) ||
      programme.rule.choose < 0 ||
      programme.rule.required.length + programme.rule.choose !== programme.rule.totalModules ||
      !programme.rule.required.includes("mathematics-1")
    ) {
      throw new Error(`Invalid ESAT module rule: ${programme.id}`);
    }
  }

  return candidate as EsatAdmissionsRegistry;
}

export const ESAT_ADMISSIONS_REGISTRY = validateRegistry(rawRegistry);

const programmeById = new Map(
  ESAT_ADMISSIONS_REGISTRY.programmes.map((programme) => [programme.id, programme]),
);

function combinations<T>(values: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  const result: T[][] = [];
  values.forEach((value, index) => {
    for (const rest of combinations(values.slice(index + 1), size - 1)) {
      result.push([value, ...rest]);
    }
  });
  return result;
}

function satisfiesRule(modules: readonly EsatModuleId[], rule: EsatModuleRule): boolean {
  const selected = new Set(modules);
  return (
    rule.required.every((moduleId) => selected.has(moduleId)) &&
    rule.from.filter((moduleId) => selected.has(moduleId)).length >= rule.choose
  );
}

export interface EsatModuleResolution {
  readonly status: "empty" | "resolved" | "choice_required" | "conflict";
  readonly programmes: readonly EsatProgramme[];
  readonly fixedModules: readonly EsatModuleId[];
  readonly options: readonly (readonly EsatModuleId[])[];
}

export function resolveEsatProgrammeSelection(
  programmeIds: readonly string[],
): EsatModuleResolution {
  const uniqueIds = [...new Set(programmeIds)];
  const programmes = uniqueIds.map((id) => {
    const programme = programmeById.get(id);
    if (programme === undefined) throw new Error(`Unknown ESAT programme: ${id}`);
    return programme;
  });
  if (programmes.length === 0) {
    return { status: "empty", programmes, fixedModules: [], options: [] };
  }

  const totalModules = Math.max(...programmes.map((programme) => programme.rule.totalModules));
  const optionalModules = ESAT_MODULE_IDS.filter((moduleId) => moduleId !== "mathematics-1");
  const options = combinations(optionalModules, totalModules - 1)
    .map((selection) => ["mathematics-1", ...selection] as EsatModuleId[])
    .filter((modules) => programmes.every((programme) => satisfiesRule(modules, programme.rule)));

  if (options.length === 0) {
    return { status: "conflict", programmes, fixedModules: [], options: [] };
  }

  const fixedModules = options[0]?.filter((moduleId) =>
    options.every((option) => option.includes(moduleId)),
  ) ?? [];
  return {
    status: options.length === 1 ? "resolved" : "choice_required",
    programmes,
    fixedModules,
    options,
  };
}
