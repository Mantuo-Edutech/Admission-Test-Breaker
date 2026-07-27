import { describe, expect, it } from "vitest";
import { EXAM_CATALOG } from "../../../src/features/catalog/exams.js";

describe("public admission-test catalog", () => {
  it("contains exactly five unique exams in the approved order", () => {
    expect(EXAM_CATALOG).toEqual([
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
    ]);
    expect(new Set(EXAM_CATALOG.map((exam) => exam.id)).size).toBe(5);
  });

  it("opens TMUA practice, exposes four official guides, and keeps every route internal", () => {
    expect(
      EXAM_CATALOG.filter((exam) => exam.availability === "open").map(
        (exam) => exam.id,
      ),
    ).toEqual(["tmua"]);
    expect(EXAM_CATALOG.every((exam) => exam.href.startsWith("/exams/"))).toBe(
      true,
    );
    expect(
      EXAM_CATALOG.filter((exam) => exam.availability === "guide").map(
        (exam) => exam.id,
      ),
    ).toEqual(["esat", "tara", "lnat", "ucat"]);
  });
});
