import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  OFFICIAL_TMUA_RESOURCES,
  assertAllowedOfficialUrl,
  buildOfficialResourceRegistry,
  syncOfficialResources,
  type OfficialFetch,
} from "../../../src/content/tmua/official-sources.js";
import type { RawPdfFacts } from "../../../src/content/tmua/pdf-tools.js";
import type { AuditStamp } from "../../../src/content/tmua/types.js";

const audit: AuditStamp = {
  generatedAt: "2026-07-13T00:00:00.000Z",
  generatedBy: "tmua-corpus-cli",
  schemaVersion: 1,
  changeReason: "official source test",
};

const temporaryRoots: string[] = [];

async function temporaryRoot() {
  const root = await mkdtemp(join(tmpdir(), "tmua-official-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

function pdfInspector(pageCountByPath?: Map<string, number>) {
  return async (
    absolutePath: string,
    portablePath: string,
  ): Promise<RawPdfFacts> => {
    const bytes = await readFile(absolutePath);
    const resource = OFFICIAL_TMUA_RESOURCES.find(
      (candidate) => portablePath.endsWith(candidate.filename),
    );
    return {
      absolutePath,
      portablePath,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      fileSize: bytes.byteLength,
      metadata: {
        pages:
          pageCountByPath?.get(portablePath) ?? resource?.expectedPages ?? 1,
      },
      openingText: "Worked Solutions",
    };
  };
}

function response(input?: {
  status?: number;
  contentType?: string;
  bytes?: string;
  url?: string;
}) {
  const status = input?.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    url:
      input?.url ??
      "https://uat-wp.s3.eu-west-2.amazonaws.com/tmua-worked.pdf",
    headers: {
      get(name: string) {
        return name.toLowerCase() === "content-type"
          ? (input?.contentType ?? "application/pdf")
          : null;
      },
    },
    async arrayBuffer() {
      return Buffer.from(input?.bytes ?? "%PDF-official");
    },
  };
}

describe("official TMUA resource registry", () => {
  it("contains exactly the four audited 2022 and 2023 worked solutions", () => {
    expect(
      OFFICIAL_TMUA_RESOURCES.map(({ id, expectedPages, officialUrl }) => ({
        id,
        expectedPages,
        officialUrl,
      })),
    ).toEqual([
      {
        id: "tmua-official-2022-paper-1-worked-solutions",
        expectedPages: 25,
        officialUrl:
          "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105226/TMUA-2022-paper-1-worked-answers.pdf",
      },
      {
        id: "tmua-official-2022-paper-2-worked-solutions",
        expectedPages: 25,
        officialUrl:
          "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105227/TMUA-2022-paper-2-worked-answers.pdf",
      },
      {
        id: "tmua-official-2023-paper-1-worked-solutions",
        expectedPages: 22,
        officialUrl:
          "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105227/TMUA-2023-paper-1-worked-answers.pdf",
      },
      {
        id: "tmua-official-2023-paper-2-worked-solutions",
        expectedPages: 23,
        officialUrl:
          "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105226/TMUA-2023-paper-2-worked-answers.pdf",
      },
    ]);
  });

  it("allows only HTTPS on the exact official host", () => {
    expect(() =>
      assertAllowedOfficialUrl(OFFICIAL_TMUA_RESOURCES[0]?.officialUrl ?? ""),
    ).not.toThrow();
    for (const url of [
      "http://uat-wp.s3.eu-west-2.amazonaws.com/file.pdf",
      "https://evil.example/file.pdf",
      "https://uat-wp.s3.eu-west-2.amazonaws.com.evil.example/file.pdf",
    ]) {
      expect(() => assertAllowedOfficialUrl(url), url).toThrow(/allowlist/i);
    }
  });

  it("keeps missing local resources as link-only records", async () => {
    const root = await temporaryRoot();
    const records = await buildOfficialResourceRegistry({
      rawRoot: root,
      audit,
      inspect: pdfInspector(),
    });

    expect(records).toHaveLength(4);
    expect(records.every((record) => record.availability === "linked")).toBe(
      true,
    );
    expect(records.every((record) => record.localPath === undefined)).toBe(true);
  });
});

describe("official TMUA resource sync", () => {
  it("downloads, validates and then reuses valid local PDFs", async () => {
    const root = await temporaryRoot();
    let fetchCount = 0;
    const fetch: OfficialFetch = async (url) => {
      fetchCount += 1;
      return response({ url });
    };

    const first = await syncOfficialResources({
      rawRoot: root,
      audit,
      fetch,
      inspect: pdfInspector(),
    });
    const second = await syncOfficialResources({
      rawRoot: root,
      audit,
      fetch,
      inspect: pdfInspector(),
    });

    expect(fetchCount).toBe(4);
    expect(first).toEqual(second);
    expect(first.every((record) => record.availability === "downloaded")).toBe(
      true,
    );
    expect(first[0]).toMatchObject({
      localPath:
        "Tmua/official-sources/TMUA-2022-paper-1-worked-answers.pdf",
      retrievedAt: audit.generatedAt,
    });
    expect(first[0]?.sha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  it.each([
    ["non-success response", response({ status: 404 }), /HTTP 404/i],
    [
      "redirected host",
      response({ url: "https://evil.example/file.pdf" }),
      /allowlist/i,
    ],
    [
      "non-PDF content type",
      response({ contentType: "text/html" }),
      /content type/i,
    ],
    ["missing PDF header", response({ bytes: "not a pdf" }), /PDF header/i],
  ])("rejects a %s", async (_label, rejectedResponse, message) => {
    const root = await temporaryRoot();
    const fetch: OfficialFetch = async () => rejectedResponse;
    await expect(
      syncOfficialResources({
        rawRoot: root,
        audit,
        fetch,
        inspect: pdfInspector(),
      }),
    ).rejects.toThrow(message);
  });

  it("rejects a page-count mismatch before publishing the target", async () => {
    const root = await temporaryRoot();
    const pages = new Map<string, number>([
      [
        "Tmua/official-sources/TMUA-2022-paper-1-worked-answers.pdf",
        24,
      ],
    ]);
    await expect(
      syncOfficialResources({
        rawRoot: root,
        audit,
        fetch: async (url) => response({ url }),
        inspect: pdfInspector(pages),
      }),
    ).rejects.toThrow(/expected 25 pages.*found 24/i);

    await expect(
      readFile(
        join(
          root,
          "official-sources",
          "TMUA-2022-paper-1-worked-answers.pdf",
        ),
      ),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("does not overwrite a corrupt existing official file", async () => {
    const root = await temporaryRoot();
    const target = join(
      root,
      "official-sources",
      "TMUA-2022-paper-1-worked-answers.pdf",
    );
    await mkdir(join(root, "official-sources"), { recursive: true });
    await writeFile(target, "corrupt");
    let fetchCount = 0;

    await expect(
      syncOfficialResources({
        rawRoot: root,
        audit,
        fetch: async (url) => {
          fetchCount += 1;
          return response({ url });
        },
        inspect: async () => {
          throw new Error("invalid PDF");
        },
      }),
    ).rejects.toThrow(/existing official resource.*invalid PDF/i);
    expect(fetchCount).toBe(0);
    expect(await readFile(target, "utf8")).toBe("corrupt");
  });
});
