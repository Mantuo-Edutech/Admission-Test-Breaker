import { createHash } from "node:crypto";
import { execFile as nodeExecFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import type { PdfMetadata } from "./types.js";

export interface RawPdfFacts {
  absolutePath: string;
  portablePath: string;
  sha256: string;
  fileSize: number;
  metadata: PdfMetadata;
  openingText: string;
}

export interface PdfToolDependencies {
  execFile(
    file: string,
    args: string[],
  ): Promise<{ stdout: string | Buffer }>;
}

const execFileAsync = promisify(nodeExecFile);

const defaultDependencies: PdfToolDependencies = {
  async execFile(file, args) {
    const result = await execFileAsync(file, args, {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    });
    return { stdout: result.stdout };
  },
};

const metadataKeys = {
  Title: "title",
  Author: "author",
  Creator: "creator",
  Producer: "producer",
  CreationDate: "creationDate",
} as const;

export function parsePdfInfo(output: string): PdfMetadata {
  const fields = new Map<string, string>();
  for (const line of output.split(/\r?\n/u)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    fields.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }

  const pages = Number.parseInt(fields.get("Pages") ?? "", 10);
  if (!Number.isInteger(pages) || pages <= 0) {
    throw new Error("pdfinfo did not return a positive page count");
  }

  const metadata: PdfMetadata = { pages };
  for (const [pdfKey, property] of Object.entries(metadataKeys)) {
    const value = fields.get(pdfKey);
    if (value) metadata[property] = value;
  }
  return metadata;
}

function popplerError(tool: string, error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(`Poppler ${tool} failed: ${detail}`, { cause: error });
}

export async function inspectPdf(
  absolutePath: string,
  portablePath: string,
  dependencies: PdfToolDependencies = defaultDependencies,
): Promise<RawPdfFacts> {
  const bytes = await readFile(absolutePath);
  let infoOutput: string;
  try {
    const result = await dependencies.execFile("pdfinfo", [absolutePath]);
    infoOutput = String(result.stdout);
  } catch (error) {
    throw popplerError("pdfinfo", error);
  }

  const metadata = parsePdfInfo(infoOutput);
  let openingText: string;
  try {
    const result = await dependencies.execFile("pdftotext", [
      "-f",
      "1",
      "-l",
      "2",
      absolutePath,
      "-",
    ]);
    openingText = String(result.stdout).trim();
  } catch (error) {
    throw popplerError("pdftotext", error);
  }

  return {
    absolutePath,
    portablePath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    fileSize: bytes.byteLength,
    metadata,
    openingText,
  };
}
