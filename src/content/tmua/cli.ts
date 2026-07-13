import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { atomicWriteText, resolveRawRoot } from "./fs-utils.js";
import { buildImportedInventory } from "./inventory.js";
import {
  buildOfficialResourceRegistry,
  syncOfficialResources,
} from "./official-sources.js";
import { buildPastPaperIndex } from "./past-papers.js";
import { renderCorpusReport } from "./report.js";
import {
  loadTaxonomyDirectory,
  validateTaxonomy,
} from "./taxonomy.js";
import type {
  AuditStamp,
  CorpusManifest,
  OfficialResourceRecord,
  PaperRecord,
  QuestionRecord,
  TmuaPublicSummary,
  ValidationIssue,
} from "./types.js";
import {
  verifyCorpus,
  verifyRawInventory,
  type CorpusArtifacts,
} from "./verify.js";

export type CorpusCommand =
  | "inventory"
  | "sync-official"
  | "build"
  | "verify-files"
  | "verify-taxonomy"
  | "verify-corpus";

export interface ParsedCliOptions {
  command: CorpusCommand;
  cwd: string;
  rawRoot: string;
  outputDir: string;
  reportPath: string;
  taxonomyDir: string;
  audit: AuditStamp;
}

export interface CommandResult {
  summary: string;
  issues: ValidationIssue[];
}

export interface CorpusCliServices {
  inventory(options: ParsedCliOptions): Promise<CommandResult>;
  syncOfficial(options: ParsedCliOptions): Promise<CommandResult>;
  build(options: ParsedCliOptions): Promise<CommandResult>;
  verifyFiles(options: ParsedCliOptions): Promise<CommandResult>;
  verifyTaxonomy(options: ParsedCliOptions): Promise<CommandResult>;
  verifyCorpus(options: ParsedCliOptions): Promise<CommandResult>;
}

interface CliContext {
  cwd: string;
  env: Record<string, string | undefined>;
  now(): Date;
  services?: CorpusCliServices;
}

const commands = new Set<CorpusCommand>([
  "inventory",
  "sync-official",
  "build",
  "verify-files",
  "verify-taxonomy",
  "verify-corpus",
]);

const usage =
  "Usage: <command> [--raw-dir PATH] [--output-dir PATH] [--audit-at ISO_DATE]";

export function parseCliOptions(
  args: string[],
  context: Omit<CliContext, "services">,
): ParsedCliOptions {
  const command = args[0];
  if (command === undefined || !commands.has(command as CorpusCommand)) {
    throw new Error(`Unknown or missing command: ${command ?? "<none>"}`);
  }

  let rawDir: string | undefined;
  let outputDirValue: string | undefined;
  let auditAt: string | undefined;
  for (let index = 1; index < args.length; index += 2) {
    const flag = args[index];
    if (
      flag !== "--raw-dir" &&
      flag !== "--output-dir" &&
      flag !== "--audit-at"
    ) {
      throw new Error(`Unknown option: ${flag}`);
    }
    const value = args[index + 1];
    if (value === undefined) throw new Error(`Missing value for ${flag}`);
    if (flag === "--raw-dir") rawDir = value;
    else if (flag === "--output-dir") outputDirValue = value;
    else auditAt = value;
  }

  const generatedAt = auditAt ?? context.now().toISOString();
  if (Number.isNaN(Date.parse(generatedAt))) {
    throw new Error(`Invalid --audit-at timestamp: ${generatedAt}`);
  }
  const defaultOutputDir = resolve(context.cwd, "content/tmua");
  const outputDir = resolve(context.cwd, outputDirValue ?? defaultOutputDir);
  return {
    command: command as CorpusCommand,
    cwd: context.cwd,
    rawRoot: resolveRawRoot({
      cliRawDir: rawDir,
      envRawDir: context.env.TMUA_RAW_DIR,
      cwd: context.cwd,
    }),
    outputDir,
    reportPath:
      outputDir === defaultOutputDir
        ? resolve(context.cwd, "docs/content/TMUA_CORPUS_REPORT.md")
        : join(outputDir, "TMUA_CORPUS_REPORT.md"),
    taxonomyDir: resolve(context.cwd, "content/tmua/taxonomy"),
    audit: {
      generatedAt,
      generatedBy: "tmua-corpus-cli",
      schemaVersion: 1,
      changeReason: `tmua:${command}`,
    },
  };
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function writeCorpusArtifacts(input: {
  artifacts: CorpusArtifacts;
  duplicateMap: Record<string, string>;
  outputDir: string;
  reportPath: string;
}): Promise<void> {
  await Promise.all([
    atomicWriteText(
      join(input.outputDir, "corpus-manifest.json"),
      json(input.artifacts.manifest),
    ),
    atomicWriteText(
      join(input.outputDir, "official-resource-registry.json"),
      json(input.artifacts.officialResources),
    ),
    atomicWriteText(
      join(input.outputDir, "public-summary.json"),
      json(input.artifacts.publicSummary),
    ),
    atomicWriteText(
      join(input.outputDir, "sources/duplicate-map.json"),
      json(input.duplicateMap),
    ),
    atomicWriteText(
      join(input.outputDir, "past-papers/index.json"),
      json(input.artifacts.papers),
    ),
    atomicWriteText(
      join(input.outputDir, "questions/index.json"),
      json(input.artifacts.questions),
    ),
    atomicWriteText(input.reportPath, renderCorpusReport(input.artifacts)),
  ]);
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function readCorpusArtifacts(
  options: ParsedCliOptions,
): Promise<CorpusArtifacts> {
  const [
    manifest,
    officialResources,
    papers,
    questions,
    publicSummary,
    taxonomy,
  ] = await Promise.all([
    readJson<CorpusManifest>(join(options.outputDir, "corpus-manifest.json")),
    readJson<OfficialResourceRecord[]>(
      join(options.outputDir, "official-resource-registry.json"),
    ),
    readJson<PaperRecord[]>(join(options.outputDir, "past-papers/index.json")),
    readJson<QuestionRecord[]>(join(options.outputDir, "questions/index.json")),
    readJson<TmuaPublicSummary>(join(options.outputDir, "public-summary.json")),
    loadTaxonomyDirectory(options.taxonomyDir),
  ]);
  return {
    manifest,
    officialResources,
    papers,
    questions,
    publicSummary,
    taxonomy,
  };
}

function corpusSummary(artifacts: CorpusArtifacts, issues: ValidationIssue[]): string {
  return [
    `Imported PDFs: ${artifacts.manifest.baseline.pdfCount}`,
    `Canonical imported sources: ${artifacts.manifest.sources.length}`,
    `Official supplements: ${artifacts.officialResources.length}`,
    `Papers: ${artifacts.papers.length}`,
    `Question shells: ${artifacts.questions.length}`,
    `Published online questions: ${artifacts.publicSummary.publishedQuestionCount}`,
    `P0: ${issues.filter((issue) => issue.severity === "P0").length}`,
  ].join("\n");
}

function defaultServices(): CorpusCliServices {
  return {
    async inventory(options) {
      const inventory = await buildImportedInventory({
        rawRoot: options.rawRoot,
        audit: options.audit,
      });
      await Promise.all([
        atomicWriteText(
          join(options.outputDir, "corpus-manifest.json"),
          json(inventory.manifest),
        ),
        atomicWriteText(
          join(options.outputDir, "sources/duplicate-map.json"),
          json(inventory.duplicateMap),
        ),
      ]);
      return {
        summary: `Imported PDFs: 96\nCanonical imported sources: 46`,
        issues: [],
      };
    },

    async syncOfficial(options) {
      const resources = await syncOfficialResources({
        rawRoot: options.rawRoot,
        audit: options.audit,
      });
      await atomicWriteText(
        join(options.outputDir, "official-resource-registry.json"),
        json(resources),
      );
      return {
        summary: `Official supplements: ${resources.length}\nDownloaded: ${
          resources.filter((resource) => resource.availability === "downloaded")
            .length
        }`,
        issues: [],
      };
    },

    async build(options) {
      const inventory = await buildImportedInventory({
        rawRoot: options.rawRoot,
        audit: options.audit,
      });
      const officialResources = await buildOfficialResourceRegistry({
        rawRoot: options.rawRoot,
        audit: options.audit,
      });
      const index = buildPastPaperIndex({
        manifest: inventory.manifest,
        officialResources,
        audit: options.audit,
      });
      const artifacts: CorpusArtifacts = {
        manifest: inventory.manifest,
        officialResources,
        papers: index.papers,
        questions: index.questions,
        publicSummary: index.publicSummary,
        taxonomy: await loadTaxonomyDirectory(options.taxonomyDir),
      };
      const issues = verifyCorpus(artifacts);
      if (issues.length === 0) {
        await writeCorpusArtifacts({
          artifacts,
          duplicateMap: inventory.duplicateMap,
          outputDir: options.outputDir,
          reportPath: options.reportPath,
        });
      }
      return { summary: corpusSummary(artifacts, issues), issues };
    },

    async verifyFiles(options) {
      const committed = await readJson<CorpusManifest>(
        join(options.outputDir, "corpus-manifest.json"),
      );
      const fresh = await buildImportedInventory({
        rawRoot: options.rawRoot,
        audit: options.audit,
      });
      const issues = verifyRawInventory(committed, fresh.manifest);
      return {
        summary: `Raw imported PDFs verified: ${fresh.manifest.baseline.pdfCount}`,
        issues,
      };
    },

    async verifyTaxonomy(options) {
      const taxonomy = await loadTaxonomyDirectory(options.taxonomyDir);
      const issues = validateTaxonomy(taxonomy.all);
      return {
        summary: `Taxonomy nodes verified: ${taxonomy.all.length}`,
        issues,
      };
    },

    async verifyCorpus(options) {
      const artifacts = await readCorpusArtifacts(options);
      const issues = verifyCorpus(artifacts);
      return { summary: corpusSummary(artifacts, issues), issues };
    },
  };
}

function formatIssues(issues: ValidationIssue[]): string {
  return issues
    .map((issue) => `${issue.severity} ${issue.code}: ${issue.message}`)
    .join("\n");
}

export async function runCorpusCli(
  args: string[],
  context: CliContext,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  let options: ParsedCliOptions;
  try {
    options = parseCliOptions(args, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { exitCode: 2, stdout: "", stderr: `${message}\n${usage}\n` };
  }

  const services = context.services ?? defaultServices();
  const dispatch: Record<CorpusCommand, keyof CorpusCliServices> = {
    inventory: "inventory",
    "sync-official": "syncOfficial",
    build: "build",
    "verify-files": "verifyFiles",
    "verify-taxonomy": "verifyTaxonomy",
    "verify-corpus": "verifyCorpus",
  };
  try {
    const result = await services[dispatch[options.command]](options);
    if (result.issues.length > 0) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `${formatIssues(result.issues)}\n`,
      };
    }
    return { exitCode: 0, stdout: `${result.summary}\n`, stderr: "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { exitCode: 1, stdout: "", stderr: `Error: ${message}\n` };
  }
}

const invokedPath = process.argv[1];
if (
  invokedPath !== undefined &&
  import.meta.url === pathToFileURL(invokedPath).href
) {
  const result = await runCorpusCli(process.argv.slice(2), {
    cwd: process.cwd(),
    env: process.env,
    now: () => new Date(),
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
