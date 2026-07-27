import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { PracticePaper, PracticeQuestion } from "../src/features/practice/content/types.js";

const run = promisify(execFile);
const root = process.cwd();
const writeMode = process.argv.includes("--write");
const verifyMode = process.argv.includes("--verify");
const resolution = 144;
const pointScale = resolution / 72;

type HistoricExam = "ESAT" | "TARA";
type EsatArchiveModule = "mathematics-1" | "physics" | "chemistry" | "biology" | "engineering-mixed";

interface PaperSlice {
  readonly id: string;
  readonly moduleId?: EsatArchiveModule;
  readonly title: string;
  readonly titleZh: string;
  readonly firstQuestion: number;
  readonly lastQuestion: number;
  readonly durationMinutes: number;
  readonly knowledgeTag: string;
}

interface SourceDefinition {
  readonly exam: HistoricExam;
  readonly family: "NSAA" | "ENGAA" | "TSA";
  readonly year: number;
  readonly questionPath: string;
  readonly answerPath: string;
  readonly totalQuestions: number;
  readonly forcedOptionCount?: number;
  readonly slices: readonly PaperSlice[];
}

interface PositionedWord {
  readonly text: string;
  readonly xMin: number;
  readonly yMin: number;
  readonly xMax: number;
  readonly yMax: number;
}

interface PdfPage {
  readonly number: number;
  readonly width: number;
  readonly height: number;
  readonly words: readonly PositionedWord[];
}

interface QuestionPosition {
  readonly sourceQuestion: number;
  readonly page: number;
  readonly top: number;
  readonly bottom: number;
  readonly optionLabels: readonly string[];
}

interface HistoricCatalogEntry {
  readonly exam: "esat" | "tara";
  readonly paperId: string;
  readonly family: SourceDefinition["family"];
  readonly year: number;
  readonly moduleId?: EsatArchiveModule;
  readonly title: string;
  readonly titleZh: string;
  readonly questionCount: number;
  readonly durationMinutes: number;
  readonly route: string;
}

const esatYears = [2021, 2022, 2023] as const;
const taraYears = [2020, 2021, 2022, 2023] as const;

function esatNsaaSource(year: number): SourceDefinition {
  const prefix = `content/official/raw/esat/NSAA_${year}_S1`;
  return {
    exam: "ESAT",
    family: "NSAA",
    year,
    questionPath: `${prefix}_QuestionPaper.pdf`,
    answerPath: `${prefix}_AnswerKey.pdf`,
    totalQuestions: 80,
    slices: [
      {
        id: `esat-nsaa-${year}-mathematics-1`,
        moduleId: "mathematics-1",
        title: `NSAA ${year} · Mathematics`,
        titleZh: `NSAA ${year} · 数学模块练习`,
        firstQuestion: 1,
        lastQuestion: 20,
        durationMinutes: 30,
        knowledgeTag: "esat-legacy-mathematics-1",
      },
      {
        id: `esat-nsaa-${year}-physics`,
        moduleId: "physics",
        title: `NSAA ${year} · Physics`,
        titleZh: `NSAA ${year} · 物理模块练习`,
        firstQuestion: 21,
        lastQuestion: 40,
        durationMinutes: 30,
        knowledgeTag: "esat-legacy-physics",
      },
      {
        id: `esat-nsaa-${year}-chemistry`,
        moduleId: "chemistry",
        title: `NSAA ${year} · Chemistry`,
        titleZh: `NSAA ${year} · 化学模块练习`,
        firstQuestion: 41,
        lastQuestion: 60,
        durationMinutes: 30,
        knowledgeTag: "esat-legacy-chemistry",
      },
      {
        id: `esat-nsaa-${year}-biology`,
        moduleId: "biology",
        title: `NSAA ${year} · Biology`,
        titleZh: `NSAA ${year} · 生物模块练习`,
        firstQuestion: 61,
        lastQuestion: 80,
        durationMinutes: 30,
        knowledgeTag: "esat-legacy-biology",
      },
    ],
  };
}

function esatEngaaSource(year: number): SourceDefinition {
  const prefix = `content/official/raw/esat/ENGAA_${year}_S1`;
  return {
    exam: "ESAT",
    family: "ENGAA",
    year,
    questionPath: `${prefix}_QuestionPaper.pdf`,
    answerPath: `${prefix}_AnswerKey.pdf`,
    totalQuestions: 40,
    slices: [{
      id: `esat-engaa-${year}-engineering-mixed`,
      moduleId: "engineering-mixed",
      title: `ENGAA ${year} · Engineering Mathematics & Physics`,
      titleZh: `ENGAA ${year} · 工程数学与物理综合练习`,
      firstQuestion: 1,
      lastQuestion: 40,
      durationMinutes: 60,
      knowledgeTag: "esat-legacy-engineering-mixed",
    }],
  };
}

function taraTsaSource(year: number): SourceDefinition {
  const prefix = `content/official/raw/tara/TSA-${year}-Section-1`;
  return {
    exam: "TARA",
    family: "TSA",
    year,
    questionPath: `${prefix}-Question-Paper.pdf`,
    answerPath: `${prefix}-Answer-Key.pdf`,
    totalQuestions: 50,
    forcedOptionCount: 5,
    slices: [{
      id: `tara-tsa-${year}-mixed-reasoning`,
      title: `TSA ${year} · Mixed Reasoning`,
      titleZh: `TSA ${year} · 批判思维与问题解决综合练习`,
      firstQuestion: 1,
      lastQuestion: 50,
      durationMinutes: 90,
      knowledgeTag: "tara-legacy-mixed-reasoning",
    }],
  };
}

const sources: readonly SourceDefinition[] = [
  ...esatYears.flatMap((year) => [esatNsaaSource(year), esatEngaaSource(year)]),
  ...taraYears.map(taraTsaSource),
];

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function parseNumber(value: string | undefined, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ${label}: ${value ?? "missing"}`);
  return parsed;
}

function parseBbox(xhtml: string): readonly PdfPage[] {
  const pages: PdfPage[] = [];
  const pagePattern = /<page width="([^"]+)" height="([^"]+)">([\s\S]*?)<\/page>/gu;
  const wordPattern = /<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([\s\S]*?)<\/word>/gu;
  for (const [index, match] of [...xhtml.matchAll(pagePattern)].entries()) {
    const words: PositionedWord[] = [];
    for (const word of (match[3] ?? "").matchAll(wordPattern)) {
      words.push({
        text: decodeXml(word[5] ?? "").trim(),
        xMin: parseNumber(word[1], "word xMin"),
        yMin: parseNumber(word[2], "word yMin"),
        xMax: parseNumber(word[3], "word xMax"),
        yMax: parseNumber(word[4], "word yMax"),
      });
    }
    pages.push({
      number: index + 1,
      width: parseNumber(match[1], "page width"),
      height: parseNumber(match[2], "page height"),
      words,
    });
  }
  if (pages.length === 0) throw new Error("pdftotext did not return any PDF pages");
  return pages;
}

function answerKey(text: string, expectedQuestions: number): ReadonlyMap<number, string> {
  const answers = new Map<number, string>();
  const pattern = /(?:Q)?(\d{1,2})\s+([A-H])(?=\s|$)/gu;
  for (const line of text.split(/\r?\n/gu)) {
    for (const match of line.matchAll(pattern)) {
      const number = Number(match[1]);
      if (number >= 1 && number <= expectedQuestions) answers.set(number, match[2]!);
    }
  }
  if (answers.size !== expectedQuestions) {
    const missing = Array.from({ length: expectedQuestions }, (_, index) => index + 1)
      .filter((number) => !answers.has(number));
    throw new Error(`Answer key has ${answers.size}/${expectedQuestions} answers; missing ${missing.join(", ")}`);
  }
  return answers;
}

function questionPositions(
  pages: readonly PdfPage[],
  source: SourceDefinition,
  answers: ReadonlyMap<number, string>,
): ReadonlyMap<number, QuestionPosition> {
  const starts = new Map<number, { page: PdfPage; y: number }>();
  for (let question = 1; question <= source.totalQuestions; question += 1) {
    const candidates = pages.flatMap((page) => page.words
      .filter((word) =>
        word.text === String(question) &&
        word.xMin >= 35 && word.xMin <= 70 &&
        word.yMin >= 50 && word.yMin <= page.height - 70
      )
      .map((word) => ({ page, y: word.yMin })));
    if (candidates.length !== 1) {
      throw new Error(`${source.family} ${source.year} question ${question} has ${candidates.length} detected starts`);
    }
    starts.set(question, candidates[0]!);
  }

  const result = new Map<number, QuestionPosition>();
  for (let question = 1; question <= source.totalQuestions; question += 1) {
    const start = starts.get(question)!;
    const next = starts.get(question + 1);
    const top = Math.max(48, start.y - 10);
    const lastContentLine = Math.max(
      ...start.page.words
        .filter((word) => word.yMin >= top && word.yMin <= start.page.height - 70)
        .map((word) => word.yMax),
    );
    const bottom = next !== undefined && next.page.number === start.page.number
      ? next.y - 9
      : Math.min(start.page.height - 62, lastContentLine + 24, 780);
    const detectedLabels = start.page.words
      .filter((word) =>
        /^[A-H]$/u.test(word.text) && word.yMin >= top && word.yMin <= bottom
      )
      .map((word) => word.text.charCodeAt(0) - 64);
    const answerIndex = answers.get(question)!.charCodeAt(0) - 64;
    const optionCount = source.forcedOptionCount ?? Math.max(4, answerIndex, ...detectedLabels);
    if (optionCount > 8 || bottom <= top + 40) {
      throw new Error(`${source.family} ${source.year} question ${question} has invalid crop or options`);
    }
    result.set(question, {
      sourceQuestion: question,
      page: start.page.number,
      top,
      bottom,
      optionLabels: Array.from({ length: optionCount }, (_, index) => String.fromCharCode(65 + index)),
    });
  }
  return result;
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sourceAssetDirectory(source: SourceDefinition): string {
  return `${source.exam.toLowerCase()}-${source.family.toLowerCase()}-${source.year}`;
}

async function renderQuestionCrop(
  source: SourceDefinition,
  position: QuestionPosition,
): Promise<string> {
  const assetDirectory = sourceAssetDirectory(source);
  const filename = `q${String(position.sourceQuestion).padStart(2, "0")}`;
  const publicDirectory = path.resolve(root, "public/questions", assetDirectory);
  const tempDirectory = path.resolve(root, "tmp/historic-practice", assetDirectory);
  await Promise.all([mkdir(publicDirectory, { recursive: true }), mkdir(tempDirectory, { recursive: true })]);
  const pngPrefix = path.join(tempDirectory, filename);
  const pngPath = `${pngPrefix}.png`;
  const webpPath = path.join(publicDirectory, `${filename}.webp`);
  const x = Math.round(32 * pointScale);
  const y = Math.round(position.top * pointScale);
  const width = Math.round(531 * pointScale);
  const height = Math.round((position.bottom - position.top) * pointScale);
  await run("pdftoppm", [
    "-f", String(position.page),
    "-l", String(position.page),
    "-singlefile",
    "-r", String(resolution),
    "-x", String(x),
    "-y", String(y),
    "-W", String(width),
    "-H", String(height),
    "-png",
    path.resolve(root, source.questionPath),
    pngPrefix,
  ], { maxBuffer: 1024 * 1024 * 8 });
  await run("cwebp", ["-quiet", "-q", "84", "-m", "6", "-metadata", "none", pngPath, "-o", webpPath]);
  await unlink(pngPath);
  return `/questions/${assetDirectory}/${filename}.webp`;
}

async function mapPool<T, U>(
  items: readonly T[],
  concurrency: number,
  task: (item: T) => Promise<U>,
): Promise<readonly U[]> {
  const output = new Array<U>(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await task(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return output;
}

function makeQuestion(
  paperId: string,
  localNumber: number,
  source: SourceDefinition,
  slice: PaperSlice,
  position: QuestionPosition,
  imagePath: string,
  correctAnswer: string,
): PracticeQuestion {
  return {
    id: `${paperId}-q${String(localNumber).padStart(2, "0")}`,
    number: localNumber,
    sourcePage: position.page,
    optionDisplay: "labels-only",
    prompt: [{
      kind: "figure",
      src: imagePath,
      alt: `${source.family} ${source.year}, source question ${position.sourceQuestion}`,
    }],
    options: position.optionLabels.map((label) => ({ label, content: [] })),
    correctAnswer,
    knowledgeTags: [slice.knowledgeTag],
    skillTags: ["official-historic-practice", source.family.toLowerCase()],
    reviewStatus: "verified",
    sourceQuestionPath: source.questionPath,
    sourceAnswerPath: source.answerPath,
  };
}

async function buildSource(source: SourceDefinition): Promise<{
  readonly papers: readonly PracticePaper[];
  readonly catalog: readonly HistoricCatalogEntry[];
  readonly sourceRecord: Readonly<Record<string, unknown>>;
}> {
  const [questionBytes, answerBytes, bboxResult, answerTextResult] = await Promise.all([
    readFile(path.resolve(root, source.questionPath)),
    readFile(path.resolve(root, source.answerPath)),
    run("pdftotext", ["-bbox-layout", path.resolve(root, source.questionPath), "-"], { maxBuffer: 1024 * 1024 * 64 }),
    run("pdftotext", ["-layout", path.resolve(root, source.answerPath), "-"], { maxBuffer: 1024 * 1024 * 16 }),
  ]);
  const pages = parseBbox(bboxResult.stdout);
  const answers = answerKey(answerTextResult.stdout, source.totalQuestions);
  const positions = questionPositions(pages, source, answers);
  const uniquePositions = [...positions.values()];
  const imagePaths = await mapPool(uniquePositions, 6, (position) => renderQuestionCrop(source, position));
  const imagesByQuestion = new Map(uniquePositions.map((position, index) => [position.sourceQuestion, imagePaths[index]!]));

  const papers = source.slices.map((slice): PracticePaper => {
    const sourceQuestions = Array.from(
      { length: slice.lastQuestion - slice.firstQuestion + 1 },
      (_, index) => slice.firstQuestion + index,
    );
    return {
      id: slice.id,
      exam: source.exam,
      edition: slice.title,
      sectionLabel: slice.title,
      sectionLabelZh: slice.titleZh,
      durationMinutes: slice.durationMinutes,
      deliveryMode: "structured",
      calculator: "none",
      responseMode: "choice",
      questions: sourceQuestions.map((sourceQuestion, index) => makeQuestion(
        slice.id,
        index + 1,
        source,
        slice,
        positions.get(sourceQuestion)!,
        imagesByQuestion.get(sourceQuestion)!,
        answers.get(sourceQuestion)!,
      )),
    };
  });
  const catalog = source.slices.map((slice): HistoricCatalogEntry => ({
    exam: source.exam.toLowerCase() as "esat" | "tara",
    paperId: slice.id,
    family: source.family,
    year: source.year,
    ...(slice.moduleId === undefined ? {} : { moduleId: slice.moduleId }),
    title: slice.title,
    titleZh: slice.titleZh,
    questionCount: slice.lastQuestion - slice.firstQuestion + 1,
    durationMinutes: slice.durationMinutes,
    route: `/practice/${slice.id}`,
  }));
  return {
    papers,
    catalog,
    sourceRecord: {
      exam: source.exam,
      family: source.family,
      year: source.year,
      questionPath: source.questionPath,
      questionSha256: digest(questionBytes),
      answerPath: source.answerPath,
      answerSha256: digest(answerBytes),
      questions: source.totalQuestions,
      pages: pages.length,
    },
  };
}

async function verifyArtifact(): Promise<void> {
  const [esatBundle, taraBundle, catalog] = await Promise.all([
    readFile(path.resolve(root, "content/esat/historic-online-papers.json"), "utf8").then(JSON.parse) as Promise<{ papers: PracticePaper[] }>,
    readFile(path.resolve(root, "content/tara/historic-online-papers.json"), "utf8").then(JSON.parse) as Promise<{ papers: PracticePaper[] }>,
    readFile(path.resolve(root, "content/practice/historic-practice-catalog.json"), "utf8").then(JSON.parse) as Promise<{ entries: HistoricCatalogEntry[] }>,
  ]);
  const papers = [...esatBundle.papers, ...taraBundle.papers];
  if (esatBundle.papers.length !== 15 || taraBundle.papers.length !== 4 || catalog.entries.length !== 19) {
    throw new Error(`Historic practice inventory mismatch: ${esatBundle.papers.length} ESAT, ${taraBundle.papers.length} TARA`);
  }
  if (new Set(papers.map((paper) => paper.id)).size !== papers.length) {
    throw new Error("Historic practice paper IDs are not unique");
  }
  const questions = papers.flatMap((paper) => paper.questions);
  if (questions.length !== 560) {
    throw new Error(`Expected 560 historic questions, received ${questions.length}`);
  }
  for (const question of questions) {
    const block = question.prompt[0];
    if (block?.kind !== "figure" || !block.src.endsWith(".webp") || question.optionDisplay !== "labels-only") {
      throw new Error(`Historic question presentation is invalid: ${question.id}`);
    }
    const image = await readFile(path.resolve(root, "public", block.src.replace(/^\//u, "")));
    if (image.length < 1_000 || image.subarray(0, 4).toString("ascii") !== "RIFF") {
      throw new Error(`Historic question image is missing or invalid: ${block.src}`);
    }
  }
  process.stdout.write(`Historic online practice: PASS (${papers.length} papers, ${questions.length} questions).\n`);
}

async function main(): Promise<void> {
  if (verifyMode) {
    await verifyArtifact();
    return;
  }
  if (!writeMode) throw new Error("Use --write to build or --verify to check historic practice");
  for (const source of sources) {
    await Promise.all([access(path.resolve(root, source.questionPath)), access(path.resolve(root, source.answerPath))]);
    await rm(path.resolve(root, "public/questions", sourceAssetDirectory(source)), { recursive: true, force: true });
  }
  await rm(path.resolve(root, "tmp/historic-practice"), { recursive: true, force: true });
  const built = [];
  for (const source of sources) {
    process.stdout.write(`Building ${source.family} ${source.year}...\n`);
    built.push(await buildSource(source));
  }
  const allPapers = built.flatMap((item) => item.papers);
  const esatPapers = allPapers.filter((paper) => paper.exam === "ESAT");
  const taraPapers = allPapers.filter((paper) => paper.exam === "TARA");
  const catalog = built.flatMap((item) => item.catalog);
  const common = {
    schemaVersion: 1,
    generatedOn: "2026-07-27",
    delivery: "question-crop-with-native-answer-controls",
    sources: built.map((item) => item.sourceRecord),
  } as const;
  await Promise.all([
    mkdir(path.resolve(root, "content/practice"), { recursive: true }),
    mkdir(path.resolve(root, "content/esat"), { recursive: true }),
    mkdir(path.resolve(root, "content/tara"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      path.resolve(root, "content/esat/historic-online-papers.json"),
      `${JSON.stringify({ ...common, exam: "ESAT", papers: esatPapers }, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.resolve(root, "content/tara/historic-online-papers.json"),
      `${JSON.stringify({ ...common, exam: "TARA", papers: taraPapers }, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.resolve(root, "content/practice/historic-practice-catalog.json"),
      `${JSON.stringify({ schemaVersion: 1, entries: catalog }, null, 2)}\n`,
      "utf8",
    ),
  ]);
  await rm(path.resolve(root, "tmp/historic-practice"), { recursive: true, force: true });
  await verifyArtifact();
  const bytes = await Promise.all(catalog.map(async (entry) => {
    const directory = sourceAssetDirectory(sources.find((source) =>
      source.family === entry.family && source.year === entry.year && source.exam.toLowerCase() === entry.exam
    )!);
    return stat(path.resolve(root, "public/questions", directory)).then(() => 1);
  }));
  process.stdout.write(`Built ${catalog.length} papers from ${new Set(bytes).size === 1 ? sources.length : 0} source papers.\n`);
}

await main();
