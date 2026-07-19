import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { extractPdfPages } from "./pdf-tools.js";
import {
  buildQuestionImportBundle,
  verifyQuestionImportBundle,
  writeQuestionImportBundle,
  type ExtractionSource,
} from "./extraction.js";
import type {
  CorpusManifest,
  OfficialResourceRecord,
  PaperRecord,
} from "./types.js";

interface ExtractCliOptions {
  cwd: string;
  paperId: string;
  rawRoot: string;
  outputDirectory: string;
  generatedAt: string;
}

interface OnlinePaperPageMap {
  id: string;
  questionPages: number[];
}

interface OnlinePaperPageMapManifest {
  papers: OnlinePaperPageMap[];
}

function parseOptions(
  args: string[],
  context: { cwd: string; env: Record<string, string | undefined>; now(): Date },
): ExtractCliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!["--paper-id", "--raw-dir", "--output-dir", "--audit-at"].includes(flag ?? "")) {
      throw new Error(`Unknown option: ${flag ?? "<none>"}`);
    }
    if (value === undefined) throw new Error(`Missing value for ${flag}`);
    values.set(flag!, value);
  }
  const paperId = values.get("--paper-id");
  if (paperId === undefined || !/^tmua-.+-p[12]$/u.test(paperId)) {
    throw new Error("--paper-id must be a stable TMUA paper ID");
  }
  const generatedAt = values.get("--audit-at") ?? context.now().toISOString();
  if (Number.isNaN(Date.parse(generatedAt))) throw new Error("--audit-at must be an ISO timestamp");
  return {
    cwd: context.cwd,
    paperId,
    rawRoot: resolve(context.cwd, values.get("--raw-dir") ?? context.env.TMUA_RAW_DIR ?? "Tmua"),
    outputDirectory: resolve(
      context.cwd,
      values.get("--output-dir") ?? join("content", "tmua", "staging", paperId),
    ),
    generatedAt,
  };
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function safeRawPath(rawRoot: string, portablePath: string): string {
  if (!portablePath.startsWith("Tmua/") || portablePath.includes("\\")) {
    throw new Error(`Unsafe TMUA source path: ${portablePath}`);
  }
  const target = resolve(rawRoot, portablePath.slice("Tmua/".length));
  const pathFromRoot = relative(resolve(rawRoot), target);
  if (
    pathFromRoot === "" ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new Error(`TMUA source path escapes the raw root: ${portablePath}`);
  }
  return target;
}

function descriptor(
  id: string,
  manifest: CorpusManifest,
  officialResources: OfficialResourceRecord[],
): ExtractionSource {
  const imported = manifest.sources.find((source) => source.id === id);
  if (imported !== undefined) {
    return { id, portablePath: imported.canonicalPath, sha256: imported.sha256 };
  }
  const official = officialResources.find((source) => source.id === id);
  if (official?.localPath === undefined || official.sha256 === undefined) {
    throw new Error(`Source ${id} is not locally available`);
  }
  return { id, portablePath: official.localPath, sha256: official.sha256 };
}

export async function extractPaper(
  args: string[],
  context: { cwd: string; env: Record<string, string | undefined>; now(): Date },
): Promise<string> {
  const options = parseOptions(args, context);
  const [manifest, papers, officialResources, onlinePaperManifest] = await Promise.all([
    readJson<CorpusManifest>(join(options.cwd, "content/tmua/corpus-manifest.json")),
    readJson<PaperRecord[]>(join(options.cwd, "content/tmua/past-papers/index.json")),
    readJson<OfficialResourceRecord[]>(
      join(options.cwd, "content/tmua/official-resource-registry.json"),
    ),
    readJson<OnlinePaperPageMapManifest>(
      join(options.cwd, "content/tmua/online-papers.json"),
    ),
  ]);
  const paper = papers.find((candidate) => candidate.id === options.paperId);
  if (paper === undefined) throw new Error(`Unknown paper ID: ${options.paperId}`);
  const onlinePaper = onlinePaperManifest.papers.find(
    (candidate) => candidate.id === options.paperId,
  );
  if (onlinePaper === undefined) {
    throw new Error(`Missing audited question page map: ${options.paperId}`);
  }

  const questionSource = descriptor(paper.questionSourceId, manifest, officialResources);
  const answerSource = descriptor(paper.answerSourceId, manifest, officialResources);
  const workedSolutionSource = descriptor(
    paper.workedSolutionSourceId,
    manifest,
    officialResources,
  );
  const [questionPages, answerPages, workedSolutionPages] = await Promise.all([
    extractPdfPages(safeRawPath(options.rawRoot, questionSource.portablePath)),
    extractPdfPages(safeRawPath(options.rawRoot, answerSource.portablePath)),
    extractPdfPages(safeRawPath(options.rawRoot, workedSolutionSource.portablePath)),
  ]);
  const bundle = buildQuestionImportBundle({
    paper,
    questionSource,
    answerSource,
    workedSolutionSource,
    questionPages,
    questionPageMap: onlinePaper.questionPages,
    answerPages,
    workedSolutionPages,
    generatedAt: options.generatedAt,
  });
  const issues = verifyQuestionImportBundle(bundle);
  if (issues.some((issue) => issue.severity === "P0")) {
    throw new Error(issues.map((issue) => `${issue.code}: ${issue.message}`).join("\n"));
  }
  await writeQuestionImportBundle(options.outputDirectory, bundle);
  return [
    `Bundle: ${bundle.id}`,
    `Questions: ${bundle.questionCount}`,
    `Publishable before review: ${bundle.publishableQuestionCount}`,
    `Output: ${relative(options.cwd, options.outputDirectory).split(sep).join("/")}`,
  ].join("\n");
}

async function main() {
  try {
    const output = await extractPaper(process.argv.slice(2), {
      cwd: process.cwd(),
      env: process.env,
      now: () => new Date(),
    });
    process.stdout.write(`${output}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main();
}
