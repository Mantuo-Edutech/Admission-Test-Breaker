import {
  lstat,
  mkdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { inspectPdf } from "./pdf-tools.js";
import type {
  AuditStamp,
  OfficialResourceRecord,
} from "./types.js";

const officialHost = "uat-wp.s3.eu-west-2.amazonaws.com";

export interface OfficialResourceDefinition {
  id: string;
  edition: "2022" | "2023";
  paper: 1 | 2;
  expectedPages: number;
  filename: string;
  officialUrl: string;
}

export interface OfficialFetchResponse {
  ok: boolean;
  status: number;
  url: string;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer | Buffer>;
}

export type OfficialFetch = (url: string) => Promise<OfficialFetchResponse>;

export const OFFICIAL_TMUA_RESOURCES: readonly OfficialResourceDefinition[] = [
  {
    id: "tmua-official-2022-paper-1-worked-solutions",
    edition: "2022",
    paper: 1,
    expectedPages: 25,
    filename: "TMUA-2022-paper-1-worked-answers.pdf",
    officialUrl:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105226/TMUA-2022-paper-1-worked-answers.pdf",
  },
  {
    id: "tmua-official-2022-paper-2-worked-solutions",
    edition: "2022",
    paper: 2,
    expectedPages: 25,
    filename: "TMUA-2022-paper-2-worked-answers.pdf",
    officialUrl:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105227/TMUA-2022-paper-2-worked-answers.pdf",
  },
  {
    id: "tmua-official-2023-paper-1-worked-solutions",
    edition: "2023",
    paper: 1,
    expectedPages: 22,
    filename: "TMUA-2023-paper-1-worked-answers.pdf",
    officialUrl:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105227/TMUA-2023-paper-1-worked-answers.pdf",
  },
  {
    id: "tmua-official-2023-paper-2-worked-solutions",
    edition: "2023",
    paper: 2,
    expectedPages: 23,
    filename: "TMUA-2023-paper-2-worked-answers.pdf",
    officialUrl:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105226/TMUA-2023-paper-2-worked-answers.pdf",
  },
];

export function assertAllowedOfficialUrl(value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Official source URL failed the allowlist: ${value}`);
  }
  if (url.protocol !== "https:" || url.hostname !== officialHost) {
    throw new Error(`Official source URL failed the allowlist: ${value}`);
  }
}

function localPaths(rawRoot: string, resource: OfficialResourceDefinition) {
  return {
    absolutePath: join(rawRoot, "official-sources", resource.filename),
    portablePath: `Tmua/official-sources/${resource.filename}`,
  };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const stats = await lstat(path);
    if (stats.isSymbolicLink()) {
      throw new Error(`Official resource may not be a symlink: ${path}`);
    }
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function linkedRecord(
  resource: OfficialResourceDefinition,
  audit: AuditStamp,
): OfficialResourceRecord {
  return {
    id: resource.id,
    edition: resource.edition,
    paper: resource.paper,
    documentType: "worked_solutions",
    officialUrl: resource.officialUrl,
    expectedPages: resource.expectedPages,
    availability: "linked",
    reviewStatus: "verified",
    audit,
  };
}

async function downloadedRecord(input: {
  resource: OfficialResourceDefinition;
  rawRoot: string;
  audit: AuditStamp;
  inspect: typeof inspectPdf;
  inspectionPath?: string;
}): Promise<OfficialResourceRecord> {
  const paths = localPaths(input.rawRoot, input.resource);
  const facts = await input.inspect(
    input.inspectionPath ?? paths.absolutePath,
    paths.portablePath,
  );
  if (facts.metadata.pages !== input.resource.expectedPages) {
    throw new Error(
      `${input.resource.id} expected ${input.resource.expectedPages} pages, found ${facts.metadata.pages}`,
    );
  }
  return {
    ...linkedRecord(input.resource, input.audit),
    availability: "downloaded",
    localPath: paths.portablePath,
    sha256: facts.sha256,
    retrievedAt: input.audit.generatedAt,
  };
}

export async function buildOfficialResourceRegistry(input: {
  rawRoot: string;
  audit: AuditStamp;
  inspect?: typeof inspectPdf;
}): Promise<OfficialResourceRecord[]> {
  const inspect = input.inspect ?? inspectPdf;
  const records: OfficialResourceRecord[] = [];
  for (const resource of OFFICIAL_TMUA_RESOURCES) {
    assertAllowedOfficialUrl(resource.officialUrl);
    const { absolutePath } = localPaths(input.rawRoot, resource);
    if (!(await fileExists(absolutePath))) {
      records.push(linkedRecord(resource, input.audit));
      continue;
    }
    try {
      records.push(
        await downloadedRecord({ resource, ...input, inspect }),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Existing official resource is invalid: ${detail}`, {
        cause: error,
      });
    }
  }
  return records;
}

const defaultFetch: OfficialFetch = async (url) => globalThis.fetch(url);

export async function syncOfficialResources(input: {
  rawRoot: string;
  audit: AuditStamp;
  fetch?: OfficialFetch;
  inspect?: typeof inspectPdf;
}): Promise<OfficialResourceRecord[]> {
  const fetch = input.fetch ?? defaultFetch;
  const inspect = input.inspect ?? inspectPdf;
  const records: OfficialResourceRecord[] = [];

  for (const resource of OFFICIAL_TMUA_RESOURCES) {
    assertAllowedOfficialUrl(resource.officialUrl);
    const paths = localPaths(input.rawRoot, resource);
    if (await fileExists(paths.absolutePath)) {
      try {
        records.push(
          await downloadedRecord({ resource, ...input, inspect }),
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Existing official resource is invalid: ${detail}`, {
          cause: error,
        });
      }
      continue;
    }

    const response = await fetch(resource.officialUrl);
    if (!response.ok) {
      throw new Error(`${resource.id} returned HTTP ${response.status}`);
    }
    assertAllowedOfficialUrl(response.url);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/pdf")) {
      throw new Error(`${resource.id} returned invalid content type: ${contentType}`);
    }
    const payload = await response.arrayBuffer();
    const bytes = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error(`${resource.id} response is missing the PDF header`);
    }

    await mkdir(join(input.rawRoot, "official-sources"), { recursive: true });
    const temporaryPath = `${paths.absolutePath}.tmp`;
    try {
      await writeFile(temporaryPath, bytes);
      const record = await downloadedRecord({
        resource,
        rawRoot: input.rawRoot,
        audit: input.audit,
        inspect,
        inspectionPath: temporaryPath,
      });
      await rename(temporaryPath, paths.absolutePath);
      records.push(record);
    } catch (error) {
      await rm(temporaryPath, { force: true });
      throw error;
    }
  }

  return records;
}
