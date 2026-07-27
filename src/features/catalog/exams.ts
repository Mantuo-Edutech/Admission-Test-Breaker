export type ExamId = "tmua" | "esat" | "tara" | "lnat" | "ucat";
export type ExamAvailability = "open" | "guide";

export interface ExamCatalogEntry {
  id: ExamId;
  name: "TMUA" | "ESAT" | "TARA" | "LNAT" | "UCAT";
  purpose: string;
  purposeZh: string;
  availability: ExamAvailability;
  href: string;
}

export const EXAM_CATALOG: readonly ExamCatalogEntry[] = [
  {
    id: "tmua",
    name: "TMUA",
    purpose: "Mathematics, Computer Science, Economics and quantitative courses",
    purposeZh: "数学、计算机、经济及相关量化专业",
    availability: "open",
    href: "/exams/tmua",
  },
  {
    id: "esat",
    name: "ESAT",
    purpose: "Engineering, Natural Sciences, Chemical and Life Sciences",
    purposeZh: "工程、自然科学、化学与生命科学相关专业",
    availability: "guide",
    href: "/exams/esat",
  },
  {
    id: "tara",
    name: "TARA",
    purpose: "Humanities, Social Sciences and selected interdisciplinary courses",
    purposeZh: "人文、社会科学及部分跨学科专业",
    availability: "guide",
    href: "/exams/tara",
  },
  {
    id: "lnat",
    name: "LNAT",
    purpose: "Law and related undergraduate courses",
    purposeZh: "法学及相关本科专业",
    availability: "guide",
    href: "/exams/lnat",
  },
  {
    id: "ucat",
    name: "UCAT",
    purpose: "Medicine, Dentistry and related clinical courses",
    purposeZh: "医学、牙科及相关临床专业",
    availability: "guide",
    href: "/exams/ucat",
  },
];
