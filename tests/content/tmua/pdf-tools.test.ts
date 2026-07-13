import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  inspectPdf,
  parsePdfInfo,
  type PdfToolDependencies,
} from "../../../src/content/tmua/pdf-tools.js";

const temporaryRoots: string[] = [];

async function fixturePdf(bytes = "%PDF-fixture") {
  const root = await mkdtemp(join(tmpdir(), "tmua-pdf-"));
  temporaryRoots.push(root);
  const path = join(root, "fixture.pdf");
  await writeFile(path, bytes);
  return { path, bytes };
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

describe("pdfinfo parsing", () => {
  it("normalizes supported metadata and requires a positive page count", () => {
    expect(
      parsePdfInfo([
        "Title:          TMUA Paper",
        "Author:         UAT UK",
        "Creator:        TeX",
        "Producer:       pdfTeX",
        "CreationDate:   Mon Jul  1 12:00:00 2024 BST",
        "Pages:          25",
      ].join("\n")),
    ).toEqual({
      pages: 25,
      title: "TMUA Paper",
      author: "UAT UK",
      creator: "TeX",
      producer: "pdfTeX",
      creationDate: "Mon Jul  1 12:00:00 2024 BST",
    });

    expect(() => parsePdfInfo("Pages: 0")).toThrow(/page count/i);
    expect(() => parsePdfInfo("Title: no pages")).toThrow(/page count/i);
  });
});

describe("PDF inspection", () => {
  it("hashes bytes and reads only the opening two pages for classification", async () => {
    const fixture = await fixturePdf();
    const calls: Array<{ file: string; args: string[] }> = [];
    const dependencies: PdfToolDependencies = {
      execFile: async (file, args) => {
        calls.push({ file, args });
        if (file === "pdfinfo") return { stdout: "Pages: 3\nTitle: Fixture\n" };
        return { stdout: "Worked Solutions\nQuestion 1\n" };
      },
    };

    const facts = await inspectPdf(
      fixture.path,
      "Tmua/fixture.pdf",
      dependencies,
    );

    expect(facts).toEqual({
      absolutePath: fixture.path,
      portablePath: "Tmua/fixture.pdf",
      sha256: createHash("sha256").update(fixture.bytes).digest("hex"),
      fileSize: Buffer.byteLength(fixture.bytes),
      metadata: { pages: 3, title: "Fixture" },
      openingText: "Worked Solutions\nQuestion 1",
    });
    expect(calls).toEqual([
      { file: "pdfinfo", args: [fixture.path] },
      {
        file: "pdftotext",
        args: ["-f", "1", "-l", "2", fixture.path, "-"],
      },
    ]);
  });

  it("explains when Poppler cannot be executed", async () => {
    const fixture = await fixturePdf();
    const dependencies: PdfToolDependencies = {
      execFile: async () => {
        const error = new Error("spawn ENOENT") as NodeJS.ErrnoException;
        error.code = "ENOENT";
        throw error;
      },
    };

    await expect(
      inspectPdf(fixture.path, "Tmua/fixture.pdf", dependencies),
    ).rejects.toThrow(/Poppler.*pdfinfo/i);
  });
});
