import type { ExamCatalogEntry, ExamId } from "../catalog/exams.js";

export type ExamPrimaryModuleId =
  | "overview"
  | "coverage"
  | "practice"
  | "notes"
  | "coaching";

export interface ExamPrimaryNavigationItem {
  readonly id: ExamPrimaryModuleId;
  readonly label: string;
  readonly to: string;
}

function coverageRoute(exam: ExamCatalogEntry): string {
  if (exam.id === "tmua" || exam.id === "esat") return `${exam.href}/coverage`;
  return `${exam.href}/preparation`;
}

export function primaryNavigationForExam(
  exam: ExamCatalogEntry,
): readonly ExamPrimaryNavigationItem[] {
  return [
    { id: "overview", label: `${exam.name} 概览`, to: exam.href },
    { id: "coverage", label: "知识覆盖", to: coverageRoute(exam) },
    { id: "practice", label: "在线练习", to: `${exam.href}/past-papers` },
    { id: "notes", label: "复习笔记", to: `${exam.href}/resources` },
    { id: "coaching", label: "名师指点", to: `${exam.href}/coaching` },
  ];
}

export function activePrimaryModule(
  examId: ExamId,
  pathname: string,
): ExamPrimaryModuleId | null {
  const examRoot = `/exams/${examId}`;
  if (pathname === examRoot) return "overview";
  if (
    pathname === `${examRoot}/profile` ||
    pathname === `${examRoot}/coverage` ||
    pathname === `${examRoot}/preparation` ||
    pathname === `${examRoot}/dashboard`
  ) return "coverage";
  if (
    pathname === `${examRoot}/past-papers` ||
    pathname === `${examRoot}/diagnostic`
  ) return "practice";
  if (
    pathname === `${examRoot}/resources` ||
    pathname.startsWith(`${examRoot}/notes/`)
  ) return "notes";
  if (pathname === `${examRoot}/coaching`) return "coaching";
  return null;
}
