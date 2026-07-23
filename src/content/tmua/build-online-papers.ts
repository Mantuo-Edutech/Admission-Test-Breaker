import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { parseAnswerKey } from "./extraction.js";
import { atomicWriteText } from "./fs-utils.js";
import { extractPdfPages, inspectPdf } from "./pdf-tools.js";
import type { CorpusManifest, PaperRecord } from "./types.js";

interface OnlinePaperRecord {
  id: string;
  edition: string;
  label: string;
  paper: 1 | 2;
  durationMinutes: 75;
  questionCount: 20;
  deliveryMode: "structured" | "source-pdf-answer-sheet";
  publicDocumentPath: string | null;
  sourceQuestionPath: string;
  sourceAnswerPath: string;
  questionSourceSha256: string;
  answerSourceSha256: string;
  questionPages: number[];
  answers: string[];
  answerLabels: "ABCDEFGH";
  reviewStatus: "source-and-answer-verified";
}

interface OnlinePaperManifest {
  schemaVersion: 1;
  exam: "TMUA";
  generatedAt: string;
  paperCount: 18;
  questionCount: 360;
  papers: OnlinePaperRecord[];
}

const legacyPageMaps: Readonly<Record<string, readonly number[]>> = {
  "tmua-specimen-p1": [3, 3, 4, 4, 5, 5, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13],
  "tmua-specimen-p2": [3, 3, 4, 5, 5, 6, 7, 8, 8, 9, 10, 10, 11, 11, 12, 12, 13, 14, 15, 16],
  "tmua-practice-2016-p1": [3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 14],
  "tmua-practice-2016-p2": [3, 3, 4, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 14, 15, 16, 17, 18, 19],
};

const structuredPaperIds = new Set([
  "tmua-specimen-p1", "tmua-specimen-p2",
  "tmua-practice-2016-p1", "tmua-practice-2016-p2",
  "tmua-2017-p1", "tmua-2017-p2",
  "tmua-2018-p1", "tmua-2018-p2",
  "tmua-2019-p1", "tmua-2019-p2",
  "tmua-2020-p1", "tmua-2020-p2",
  "tmua-2021-p1", "tmua-2021-p2",
  "tmua-2022-p1", "tmua-2022-p2",
  "tmua-2023-p1", "tmua-2023-p2",
]);

function paperLabel(edition: string): string {
  if (edition === "specimen") return "Early specimen";
  if (edition === "practice-2016") return "2016 Practice";
  return edition;
}

function questionPages(paper: PaperRecord): number[] {
  const legacy = legacyPageMaps[paper.id];
  if (legacy !== undefined) return [...legacy];
  return Array.from({ length: 20 }, (_, index) => index + 3);
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function sourceFor(manifest: CorpusManifest, id: string) {
  const source = manifest.sources.find((candidate) => candidate.id === id);
  if (source === undefined) throw new Error(`Missing imported source: ${id}`);
  return source;
}

function safeRawPath(rawRoot: string, portablePath: string): string {
  if (!portablePath.startsWith("Tmua/") || portablePath.includes("\\")) {
    throw new Error(`Unsafe TMUA source path: ${portablePath}`);
  }
  const path = resolve(rawRoot, portablePath.slice("Tmua/".length));
  const relativePath = relative(rawRoot, path);
  if (relativePath.startsWith(`..${sep}`) || relativePath === "..") {
    throw new Error(`TMUA source path escapes the raw directory: ${portablePath}`);
  }
  return path;
}

export async function buildOnlinePaperManifest(input: {
  cwd: string;
  rawRoot: string;
  generatedAt: string;
}): Promise<OnlinePaperManifest> {
  const [manifest, papers] = await Promise.all([
    readJson<CorpusManifest>(join(input.cwd, "content/tmua/corpus-manifest.json")),
    readJson<PaperRecord[]>(join(input.cwd, "content/tmua/past-papers/index.json")),
  ]);
  const outputDirectory = join(input.cwd, "public/papers/tmua");
  await mkdir(outputDirectory, { recursive: true });

  const onlinePapers: OnlinePaperRecord[] = [];
  for (const paper of papers) {
    const questionSource = sourceFor(manifest, paper.questionSourceId);
    const answerSource = sourceFor(manifest, paper.answerSourceId);
    const questionPath = safeRawPath(input.rawRoot, questionSource.canonicalPath);
    const answerPath = safeRawPath(input.rawRoot, answerSource.canonicalPath);
    const [questionFacts, answerFacts, answerPages] = await Promise.all([
      inspectPdf(questionPath, questionSource.canonicalPath),
      inspectPdf(answerPath, answerSource.canonicalPath),
      extractPdfPages(answerPath),
    ]);
    if (questionFacts.sha256 !== questionSource.sha256) {
      throw new Error(`${paper.id} question PDF hash does not match the corpus manifest`);
    }
    if (answerFacts.sha256 !== answerSource.sha256) {
      throw new Error(`${paper.id} answer PDF hash does not match the corpus manifest`);
    }

    const locatedAnswers = parseAnswerKey(answerPages, paper.paper);
    const answers = Array.from({ length: 20 }, (_, index) => {
      const answer = locatedAnswers.get(index + 1)?.label;
      if (answer === undefined) throw new Error(`${paper.id} answer ${index + 1} was not found`);
      return answer;
    });
    const pages = questionPages(paper);
    if (pages.length !== 20 || pages.some((page) => page < 1 || page > questionFacts.metadata.pages)) {
      throw new Error(`${paper.id} has an invalid question-to-PDF page map`);
    }

    const assetName = `${paper.id}.pdf`;
    const structured = structuredPaperIds.has(paper.id);
    const publicAssetPath = join(outputDirectory, assetName);
    if (structured) await rm(publicAssetPath, { force: true });
    else await copyFile(questionPath, publicAssetPath);
    onlinePapers.push({
      id: paper.id,
      edition: paper.edition,
      label: paperLabel(paper.edition),
      paper: paper.paper,
      durationMinutes: 75,
      questionCount: 20,
      deliveryMode: structured ? "structured" : "source-pdf-answer-sheet",
      publicDocumentPath: structured ? null : `/papers/tmua/${assetName}`,
      sourceQuestionPath: questionSource.canonicalPath,
      sourceAnswerPath: answerSource.canonicalPath,
      questionSourceSha256: questionSource.sha256,
      answerSourceSha256: answerSource.sha256,
      questionPages: pages,
      answers,
      answerLabels: "ABCDEFGH",
      reviewStatus: "source-and-answer-verified",
    });
  }

  if (onlinePapers.length !== 18) throw new Error("Online manifest must contain 18 papers");
  return {
    schemaVersion: 1,
    exam: "TMUA",
    generatedAt: input.generatedAt,
    paperCount: 18,
    questionCount: 360,
    papers: onlinePapers,
  };
}

async function main() {
  const cwd = process.cwd();
  const rawRoot = resolve(cwd, process.env.TMUA_RAW_DIR ?? "Tmua");
  const generatedAt = process.env.TMUA_ONLINE_AUDIT_AT ?? new Date().toISOString();
  const manifest = await buildOnlinePaperManifest({ cwd, rawRoot, generatedAt });
  await atomicWriteText(
    join(cwd, "content/tmua/online-papers.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  process.stdout.write(
    `Online TMUA papers: ${manifest.paperCount}\nOnline questions: ${manifest.questionCount}\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
