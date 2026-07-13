import { describe, expect, it } from "vitest";
import { EXAM_CATALOG } from "../../../src/features/catalog/exams.js";

describe("public admission-test catalog", () => {
  it("contains exactly four unique exams in the approved order", () => {
    expect(EXAM_CATALOG).toEqual([
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
        statusLabel: "资料馆建设中",
        href: "/exams/esat",
      },
      {
        id: "tara",
        name: "TARA",
        purpose: "批判思维、问题解决与写作",
        availability: "building",
        statusLabel: "资料馆建设中",
        href: "/exams/tara",
      },
      {
        id: "ucat",
        name: "UCAT",
        purpose: "医学与牙科申请能力测试",
        availability: "building",
        statusLabel: "资料馆建设中",
        href: "/exams/ucat",
      },
    ]);
    expect(new Set(EXAM_CATALOG.map((exam) => exam.id)).size).toBe(4);
  });

  it("opens only TMUA and keeps every route internal", () => {
    expect(
      EXAM_CATALOG.filter((exam) => exam.availability === "open").map(
        (exam) => exam.id,
      ),
    ).toEqual(["tmua"]);
    expect(EXAM_CATALOG.every((exam) => exam.href.startsWith("/exams/"))).toBe(
      true,
    );
    expect(
      EXAM_CATALOG.filter((exam) => exam.availability === "building").every(
        (exam) => exam.statusLabel.length > 0,
      ),
    ).toBe(true);
  });
});
