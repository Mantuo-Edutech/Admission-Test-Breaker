import {
  mkdir,
  mkdtemp,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildImportedInventory } from "../../../src/content/tmua/inventory.js";
import type { RawPdfFacts } from "../../../src/content/tmua/pdf-tools.js";
import type { AuditStamp } from "../../../src/content/tmua/types.js";

const audit: AuditStamp = {
  generatedAt: "2026-07-13T00:00:00.000Z",
  generatedBy: "tmua-corpus-cli",
  schemaVersion: 1,
  changeReason: "inventory test",
};

const editions = [
  { id: "specimen", filename: "specimen", label: "specimen" },
  { id: "practice-2016", filename: "practice(2016)", label: "practice 2016" },
  ...["2017", "2018", "2019", "2020", "2021", "2022", "2023"].map(
    (year) => ({ id: year, filename: year, label: year }),
  ),
];

interface SourceFixture {
  path: string;
  openingText: string;
}

function sourceFixtures(): SourceFixture[] {
  const questionPapers = editions.flatMap((edition) =>
    ([1, 2] as const).map((paper) => ({
      path: `2016-2023paper/tmua-paper-${paper}-${edition.filename}.pdf`,
      openingText: `TMUA ${edition.label} Paper ${paper}`,
    })),
  );
  const workedSolutions = editions.slice(0, 7).flatMap((edition) =>
    ([1, 2] as const).map((paper) => ({
      path: `2016-2023 answer/tmua-paper-${paper}-${edition.filename}.pdf`,
      openingText: `TMUA ${edition.label} Paper ${paper} Worked Solutions`,
    })),
  );
  const answerKeys = editions.map((edition) => ({
    path: `2016-2023 answer key/tmua-${edition.filename}.pdf`,
    openingText: `TMUA ${edition.label} Answer Key`,
  }));
  return [
    ...questionPapers,
    ...workedSolutions,
    ...answerKeys,
    { path: "student textbook.pdf", openingText: "Student textbook" },
    {
      path: "student workbook/student workbook.pdf",
      openingText: "Student workbook",
    },
    {
      path: "student workbook/tmua workbook answers.pdf",
      openingText: "Workbook answers",
    },
    {
      path: "2016-2021 answer key 集锦.pdf",
      openingText: "Answer key compilation",
    },
    {
      path: "tmua-notes-on-logic-and-proof-enhanced-test-specification-.pdf",
      openingText: "Enhanced Test Specification",
    },
  ];
}

const temporaryRoots: string[] = [];

async function corpusFixture() {
  const root = await mkdtemp(join(tmpdir(), "tmua-inventory-"));
  temporaryRoots.push(root);
  const inspection = new Map<
    string,
    { sha256: string; openingText: string }
  >();
  const paths: string[] = [];

  for (const [index, source] of sourceFixtures().entries()) {
    const sha256 = (index + 1).toString(16).padStart(64, "0");
    const copies = [
      source.path,
      source.path.replace(/\.pdf$/u, "(1).pdf"),
      ...(index < 4 ? [source.path.replace(/\.pdf$/u, "(2).pdf")] : []),
    ];
    for (const relativePath of copies) {
      const absolutePath = join(root, relativePath);
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, `%PDF-${index}`);
      const portablePath = `Tmua/${relativePath}`;
      paths.push(absolutePath);
      inspection.set(portablePath, { sha256, openingText: source.openingText });
    }
  }

  const inspect = async (
    absolutePath: string,
    portablePath: string,
  ): Promise<RawPdfFacts> => {
    const fixture = inspection.get(portablePath);
    if (fixture === undefined) throw new Error(`Missing fixture: ${portablePath}`);
    return {
      absolutePath,
      portablePath,
      sha256: fixture.sha256,
      fileSize: 100,
      metadata: { pages: 2 },
      openingText: fixture.openingText,
    };
  };

  return { root, paths, inspect };
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

describe("TMUA imported inventory", () => {
  it("builds a deterministic 96-path, 46-source manifest", async () => {
    const fixture = await corpusFixture();

    const first = await buildImportedInventory({
      rawRoot: fixture.root,
      audit,
      inspect: fixture.inspect,
    });
    const second = await buildImportedInventory({
      rawRoot: fixture.root,
      audit,
      inspect: fixture.inspect,
    });

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.manifest.baseline).toEqual({
      pdfCount: 96,
      uniqueContentCount: 46,
      auditedAt: "2026-07-12",
    });
    expect(first.manifest.sources).toHaveLength(46);
    expect(
      first.manifest.sources.reduce(
        (sum, source) => sum + 1 + source.duplicatePaths.length,
        0,
      ),
    ).toBe(96);
    expect(Object.keys(first.duplicateMap)).toHaveLength(96);
    expect(Object.keys(first.duplicateMap)).toEqual(
      [...Object.keys(first.duplicateMap)].sort(),
    );
  });

  it("blocks an imported path-count drift", async () => {
    const fixture = await corpusFixture();
    const removed = fixture.paths.at(-1);
    if (removed === undefined) throw new Error("Fixture did not create files");
    await unlink(removed);

    await expect(
      buildImportedInventory({
        rawRoot: fixture.root,
        audit,
        inspect: fixture.inspect,
      }),
    ).rejects.toThrow(/expected 96.*found 95/i);
  });
});
