import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeMineruContentList } from "./mineru-normalizer.js";
import { verifyNormalizedImportedDocument } from "./verify.js";

interface MineruCliOptions {
  input: string;
  output: string;
  sourceId: string;
  sourceSha256: string;
  providerVersion: string;
  backend: "pipeline" | "vlm" | "hybrid";
  parsedAt: string;
}

function parseOptions(args: string[], cwd: string): MineruCliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (flag === undefined || value === undefined) throw new Error("Every option requires a value");
    values.set(flag, value);
  }
  const required = (flag: string): string => {
    const value = values.get(flag);
    if (value === undefined || value.trim() === "") throw new Error(`Missing ${flag}`);
    return value;
  };
  const backend = required("--backend");
  if (backend !== "pipeline" && backend !== "vlm" && backend !== "hybrid") {
    throw new Error("--backend must be pipeline, vlm or hybrid");
  }
  return {
    input: resolve(cwd, required("--input")),
    output: resolve(cwd, required("--output")),
    sourceId: required("--source-id"),
    sourceSha256: required("--source-sha256"),
    providerVersion: required("--provider-version"),
    backend,
    parsedAt: required("--parsed-at"),
  };
}

export async function normalizeMineruFile(args: string[], cwd: string): Promise<string> {
  const options = parseOptions(args, cwd);
  const raw: unknown = JSON.parse(await readFile(options.input, "utf8"));
  const document = normalizeMineruContentList({
    sourceId: options.sourceId,
    sourceSha256: options.sourceSha256,
    providerVersion: options.providerVersion,
    backend: options.backend,
    parsedAt: options.parsedAt,
    contentList: raw,
  });
  const issues = verifyNormalizedImportedDocument(document);
  const p0 = issues.filter((issue) => issue.severity === "P0");
  if (p0.length > 0) {
    throw new Error(p0.map((issue) => `${issue.code}: ${issue.message}`).join("\n"));
  }
  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  return `Blocks: ${document.blocks.length}\nWarnings: ${document.warnings.length}\nPublishable: false`;
}

async function main() {
  try {
    const output = await normalizeMineruFile(process.argv.slice(2), process.cwd());
    process.stdout.write(`${output}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main();
}
