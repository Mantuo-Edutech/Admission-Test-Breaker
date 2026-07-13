import { describe, expect, it } from "vitest";
import {
  ClassificationError,
  classifyPdf,
} from "../../../src/content/tmua/classify.js";
import type { RawPdfFacts } from "../../../src/content/tmua/pdf-tools.js";

function facts(
  portablePath: string,
  openingText: string,
  title?: string,
): RawPdfFacts {
  return {
    absolutePath: `/fixture/${portablePath}`,
    portablePath,
    sha256: "a".repeat(64),
    fileSize: 100,
    metadata: { pages: 2, ...(title ? { title } : {}) },
    openingText,
  };
}

describe("TMUA source classification", () => {
  it.each([
    {
      pdf: facts("Tmua/student textbook.pdf", "Student textbook"),
      expected: {
        provenance: "original_teaching",
        documentType: "teaching_textbook",
      },
    },
    {
      pdf: facts(
        "Tmua/student workbook/student workbook.pdf",
        "TMUA student workbook",
      ),
      expected: {
        provenance: "original_compilation",
        documentType: "topic_workbook",
      },
    },
    {
      pdf: facts(
        "Tmua/student workbook/tmua workbook answers.pdf",
        "Workbook answers",
      ),
      expected: {
        provenance: "original_compilation",
        documentType: "answer_map",
      },
    },
    {
      pdf: facts(
        "Tmua/tmua-notes-on-logic-and-proof-enhanced-test-specification-.pdf",
        "Notes on Logic and Proof Enhanced Test Specification",
      ),
      expected: {
        provenance: "official_source",
        documentType: "content_specification",
      },
    },
    {
      pdf: facts(
        "Tmua/2016-2023paper/tmua-paper-1-2021.pdf",
        "Test of Mathematics for University Admission 2021 Paper 1",
      ),
      expected: {
        provenance: "official_source",
        documentType: "question_paper",
        edition: "2021",
        paper: 1,
      },
    },
    {
      pdf: facts(
        "Tmua/2016-2023 answer key/tmua-2023.pdf",
        "TMUA 2023 answer keys and score conversion",
      ),
      expected: {
        provenance: "official_source",
        documentType: "answer_key",
        edition: "2023",
      },
    },
    {
      pdf: facts(
        "Tmua/2016-2023 answer/tmua-paper-2-2021.pdf",
        "Test of Mathematics for University Admission 2021 Paper 2 Worked Solutions",
      ),
      expected: {
        provenance: "official_source",
        documentType: "worked_solutions",
        edition: "2021",
        paper: 2,
      },
    },
  ])("classifies $pdf.portablePath", ({ pdf, expected }) => {
    expect(classifyPdf(pdf)).toEqual(expected);
  });

  it.each(["2022", "2023"])(
    "treats the %s file in the answer directory as an answer key",
    (edition) => {
      const pdf = facts(
        `Tmua/2016-2023 answer/tmua-${edition}.pdf`,
        `TMUA ${edition} answer keys and score conversion table`,
      );

      expect(classifyPdf(pdf)).toMatchObject({
        documentType: "answer_key",
        edition,
      });
    },
  );

  it("parses specimen and 2016 practice editions without inventing a year", () => {
    expect(
      classifyPdf(
        facts(
          "Tmua/2016-2023paper/tmua-paper-1-specimen.pdf",
          "TMUA specimen paper 1",
        ),
      ),
    ).toMatchObject({ edition: "specimen", paper: 1 });

    expect(
      classifyPdf(
        facts(
          "Tmua/2016-2023paper/tmua-paper-2-practice(2016).pdf",
          "TMUA practice paper 2",
        ),
      ),
    ).toMatchObject({ edition: "practice-2016", paper: 2 });
  });

  it("rejects unknown or conflicting material", () => {
    expect(() =>
      classifyPdf(facts("Tmua/mystery.pdf", "Unidentified notes")),
    ).toThrow(ClassificationError);

    expect(() =>
      classifyPdf(
        facts(
          "Tmua/2016-2023paper/tmua-paper-1-2028.pdf",
          "TMUA 2028 Paper 1",
        ),
      ),
    ).toThrow(/supported edition/i);
  });
});
