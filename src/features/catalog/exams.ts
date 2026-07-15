export type ExamId = "tmua" | "esat" | "tara" | "ucat";
export type ExamAvailability = "open" | "building";

export interface ExamCatalogEntry {
  id: ExamId;
  name: "TMUA" | "ESAT" | "TARA" | "UCAT";
  purpose: string;
  availability: ExamAvailability;
  statusLabel: string;
  href: string;
}

export const EXAM_CATALOG: readonly ExamCatalogEntry[] = [
  {
    id: "tmua",
    name: "TMUA",
    purpose: "数学知识应用与数学推理",
    availability: "open",
    statusLabel: "现已开放",
    href: "/exams/tmua",
  },
  {
    id: "esat",
    name: "ESAT",
    purpose: "数学与科学模块化入学测试",
    availability: "building",
    statusLabel: "建设中",
    href: "/exams/esat",
  },
  {
    id: "tara",
    name: "TARA",
    purpose: "批判思维、问题解决与写作",
    availability: "building",
    statusLabel: "建设中",
    href: "/exams/tara",
  },
  {
    id: "ucat",
    name: "UCAT",
    purpose: "医学与牙科申请能力测试",
    availability: "building",
    statusLabel: "建设中",
    href: "/exams/ucat",
  },
];
