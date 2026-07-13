import { describe, expect, it } from "vitest";
import { groupCanonicalSources } from "../../../src/content/tmua/canonicalize.js";
import type { RawPdfFacts } from "../../../src/content/tmua/pdf-tools.js";
import type { AuditStamp } from "../../../src/content/tmua/types.js";

const audit: AuditStamp = {
  generatedAt: "2026-07-13T00:00:00.000Z",
  generatedBy: "tmua-corpus-cli",
  schemaVersion: 1,
  changeReason: "canonical test",
};

function facts(
  portablePath: string,
  sha256: string,
  openingText = "TMUA 2022 answer keys and score conversion",
): RawPdfFacts {
  return {
    absolutePath: `/fixture/${portablePath}`,
    portablePath,
    sha256,
    fileSize: 100,
    metadata: { pages: 2 },
    openingText,
  };
}

describe("TMUA canonical source grouping", () => {
  it("prefers a non-copy path in the directory matching its content", () => {
    const digest = "a".repeat(64);
    const sources = groupCanonicalSources(
      [
        facts("Tmua/2016-2023 answer/tmua-2022.pdf", digest),
        facts("Tmua/2016-2023 answer key/tmua-2022(1).pdf", digest),
        facts("Tmua/2016-2023 answer key/tmua-2022.pdf", digest),
      ],
      audit,
    );

    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      id: "tmua-official-2022-answer-key",
      canonicalPath: "Tmua/2016-2023 answer key/tmua-2022.pdf",
      duplicatePaths: [
        "Tmua/2016-2023 answer key/tmua-2022(1).pdf",
        "Tmua/2016-2023 answer/tmua-2022.pdf",
      ],
      documentType: "answer_key",
      edition: "2022",
    });
  });

  it("uses shortest then lexicographic path as deterministic tie-breaks", () => {
    const digest = "b".repeat(64);
    const openingText = "TMUA 2021 Paper 1 Worked Solutions";
    const sources = groupCanonicalSources(
      [
        facts("Tmua/2016-2023 answer/long/tmua-paper-1-2021.pdf", digest, openingText),
        facts("Tmua/2016-2023 answer/b.pdf", digest, openingText),
        facts("Tmua/2016-2023 answer/a.pdf", digest, openingText),
      ],
      audit,
    );

    expect(sources[0]?.canonicalPath).toBe(
      "Tmua/2016-2023 answer/a.pdf",
    );
  });

  it("sorts sources and preserves every duplicate path", () => {
    const sources = groupCanonicalSources(
      [
        facts(
          "Tmua/2016-2023paper/tmua-paper-1-2021.pdf",
          "b".repeat(64),
          "TMUA 2021 Paper 1",
        ),
        facts(
          "Tmua/2016-2023paper/tmua-paper-1-2021(1).pdf",
          "b".repeat(64),
          "TMUA 2021 Paper 1",
        ),
        facts(
          "Tmua/2016-2023paper/tmua-paper-2-2021.pdf",
          "a".repeat(64),
          "TMUA 2021 Paper 2",
        ),
      ],
      audit,
    );

    expect(sources.map((source) => source.id)).toEqual([
      "tmua-official-2021-paper-1",
      "tmua-official-2021-paper-2",
    ]);
    expect(
      sources.flatMap((source) => [
        source.canonicalPath,
        ...source.duplicatePaths,
      ]),
    ).toHaveLength(3);
  });

  it("rejects one digest that receives conflicting classifications", () => {
    const digest = "c".repeat(64);
    expect(() =>
      groupCanonicalSources(
        [
          facts(
            "Tmua/2016-2023paper/tmua-paper-1-2021.pdf",
            digest,
            "TMUA 2021 Paper 1",
          ),
          facts(
            "Tmua/2016-2023 answer key/tmua-2021.pdf",
            digest,
            "TMUA 2021 answer key",
          ),
        ],
        audit,
      ),
    ).toThrow(/conflicting classifications/i);
  });
});
