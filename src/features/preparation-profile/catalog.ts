export type CurriculumSystemId = "caie" | "pearson-ial";

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
  readonly sourceRegistryId: "caie" | "pearson-ial";
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
];

export function qualificationsForSystem(
  system: CurriculumSystemId,
): readonly QualificationOption[] {
  return PREPARATION_CATALOG.filter((qualification) => qualification.system === system);
}

export function qualificationById(id: string): QualificationOption | null {
  return PREPARATION_CATALOG.find((qualification) => qualification.id === id) ?? null;
}
