import { createHash } from "node:crypto";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

type ExamId = "shared" | "tmua" | "esat" | "tara" | "lnat" | "ucat";
type RightsStatus =
  | "personal_use_only_permission_required_for_commercial_use"
  | "internal_noncommercial_only_permission_required_for_commercial_use"
  | "rights_review_required_before_republication";

interface SourcePageDefinition {
  readonly id: string;
  readonly exam: ExamId;
  readonly title: string;
  readonly url: string;
  readonly rightsStatus: RightsStatus;
}

interface DiscoveredAsset {
  readonly id: string;
  readonly exam: ExamId;
  readonly title: string;
  readonly kind: string;
  readonly url: string;
  readonly discoveredOn: readonly string[];
  readonly rightsStatus: RightsStatus;
  readonly publishable: false;
  readonly localPath: string;
  readonly mediaType: "application/pdf" | "application/rtf";
  readonly downloadStatus: "downloaded" | "failed";
  readonly bytes: number | null;
  readonly sha256: string | null;
  readonly error?: string;
}

const root = process.cwd();
const rawRoot = path.resolve(root, "content/official/raw");
const inventoryPath = path.resolve(root, "content/official/research-asset-inventory.json");

const sourcePages: readonly SourcePageDefinition[] = [
  { id: "uat-prepare", exam: "shared", title: "UAT-UK preparation materials", url: "https://esat-tmua.ac.uk/prepare/", rightsStatus: "personal_use_only_permission_required_for_commercial_use" },
  { id: "uat-terms", exam: "shared", title: "UAT-UK website terms", url: "https://esat-tmua.ac.uk/website-terms-of-use/", rightsStatus: "personal_use_only_permission_required_for_commercial_use" },
  { id: "tmua-overview", exam: "tmua", title: "TMUA overview", url: "https://esat-tmua.ac.uk/about-the-tests/tmua-test/", rightsStatus: "personal_use_only_permission_required_for_commercial_use" },
  { id: "tmua-preparation", exam: "tmua", title: "TMUA preparation archive", url: "https://esat-tmua.ac.uk/tmua-preparation-materials/", rightsStatus: "personal_use_only_permission_required_for_commercial_use" },
  { id: "esat-overview", exam: "esat", title: "ESAT overview", url: "https://esat-tmua.ac.uk/about-the-tests/esat-test/", rightsStatus: "personal_use_only_permission_required_for_commercial_use" },
  { id: "esat-preparation", exam: "esat", title: "ESAT guide and historic archive", url: "https://esat-tmua.ac.uk/esat-preparation-materials/", rightsStatus: "personal_use_only_permission_required_for_commercial_use" },
  { id: "tara-overview", exam: "tara", title: "TARA overview", url: "https://esat-tmua.ac.uk/about-the-tests/tara/", rightsStatus: "personal_use_only_permission_required_for_commercial_use" },
  { id: "tara-preparation", exam: "tara", title: "TARA guide and historic archive", url: "https://esat-tmua.ac.uk/tara-preparation-materials/", rightsStatus: "personal_use_only_permission_required_for_commercial_use" },
  { id: "lnat-format", exam: "lnat", title: "LNAT test format", url: "https://lnat.ac.uk/what-is-lnat/test-format/", rightsStatus: "rights_review_required_before_republication" },
  { id: "lnat-prepare", exam: "lnat", title: "LNAT preparation overview", url: "https://lnat.ac.uk/how-to-prepare/", rightsStatus: "rights_review_required_before_republication" },
  { id: "lnat-guide", exam: "lnat", title: "LNAT preparation guide", url: "https://lnat.ac.uk/how-to-prepare/preparation-guide/", rightsStatus: "rights_review_required_before_republication" },
  { id: "lnat-hints", exam: "lnat", title: "LNAT hints and tips", url: "https://lnat.ac.uk/how-to-prepare/hints-and-tips/", rightsStatus: "rights_review_required_before_republication" },
  { id: "lnat-practice", exam: "lnat", title: "LNAT practice tests", url: "https://lnat.ac.uk/how-to-prepare/practice-test/", rightsStatus: "rights_review_required_before_republication" },
  { id: "lnat-essays", exam: "lnat", title: "LNAT sample essays", url: "https://lnat.ac.uk/how-to-prepare/sample-essays/", rightsStatus: "rights_review_required_before_republication" },
  { id: "ucat-format", exam: "ucat", title: "UCAT format and scoring", url: "https://www.ucat.ac.uk/about-ucat/test-format-and-scoring/", rightsStatus: "internal_noncommercial_only_permission_required_for_commercial_use" },
  { id: "ucat-essentials", exam: "ucat", title: "UCAT essentials", url: "https://www.ucat.ac.uk/about-ucat/ucat-essentials/", rightsStatus: "internal_noncommercial_only_permission_required_for_commercial_use" },
  { id: "ucat-preparation", exam: "ucat", title: "UCAT preparation resources", url: "https://www.ucat.ac.uk/prepare/preparation-resources/", rightsStatus: "internal_noncommercial_only_permission_required_for_commercial_use" },
  { id: "ucat-tools", exam: "ucat", title: "UCAT test tools", url: "https://www.ucat.ac.uk/prepare/test-tools/", rightsStatus: "internal_noncommercial_only_permission_required_for_commercial_use" },
  { id: "ucat-tutorials", exam: "ucat", title: "UCAT question tutorials", url: "https://www.ucat.ac.uk/prepare/question-tutorials/", rightsStatus: "internal_noncommercial_only_permission_required_for_commercial_use" },
  { id: "ucat-practice", exam: "ucat", title: "UCAT practice tests and question banks", url: "https://www.ucat.ac.uk/prepare/practice-tests/", rightsStatus: "internal_noncommercial_only_permission_required_for_commercial_use" },
  { id: "ucat-candidate-advice", exam: "ucat", title: "UCAT candidate advice", url: "https://www.ucat.ac.uk/candidate-advice/advice-from-past-candidates/", rightsStatus: "internal_noncommercial_only_permission_required_for_commercial_use" },
  { id: "ucat-teacher-resources", exam: "ucat", title: "UCAT teacher and adviser resources", url: "https://www.ucat.ac.uk/teachers-and-advisers/resources/", rightsStatus: "internal_noncommercial_only_permission_required_for_commercial_use" },
  { id: "ucat-terms", exam: "ucat", title: "UCAT website terms", url: "https://www.ucat.ac.uk/legal-notice/", rightsStatus: "internal_noncommercial_only_permission_required_for_commercial_use" },
];

const directAssets = [
  {
    exam: "shared" as const,
    title: "UAT-UK Candidate Handbook - 2027 Entry",
    url: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2026/06/26111813/Candidate-Handbook-2027-Entry.pdf",
    discoveredOn: "uat-prepare",
    rightsStatus: "personal_use_only_permission_required_for_commercial_use" as const,
  },
];

const interactiveResources = [
  { id: "uat-pearson-sample-tests", exam: "shared", title: "UAT-UK Pearson specimen and practice tests", url: "https://www.pearsonvue.com/us/en/uatuk.html" },
  { id: "lnat-online-practice", exam: "lnat", title: "LNAT online practice simulation", url: "https://lnat.ac.uk/lnat-sample-test" },
  { id: "ucat-question-tutorials", exam: "ucat", title: "UCAT interactive question tutorials", url: "https://www.ucat.ac.uk/prepare/question-tutorials/" },
  { id: "ucat-practice-tests", exam: "ucat", title: "UCAT interactive question banks and practice tests", url: "https://www.ucat.ac.uk/prepare/practice-tests/" },
] as const;

function hash(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]*>/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/&#0?39;|&apos;/gu, "'")
    .replace(/&quot;/gu, '"')
    .replace(/&nbsp;/gu, " ")
    .replace(/&#(\d+);/gu, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/gu, " ")
    .trim();
}

function safeFilename(url: URL): string {
  const basename = decodeURIComponent(path.posix.basename(url.pathname));
  return basename.replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "");
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
}

function assetId(exam: ExamId, filename: string, url: string): string {
  const urlHash = createHash("sha256").update(url).digest("hex").slice(0, 8);
  return `${exam}-${slug(filename.replace(/\.[^.]+$/u, ""))}-${urlHash}`;
}

function classify(filename: string): string {
  const value = filename.toLowerCase();
  if (value.includes("specification")) return "specification";
  if (value.includes("question") && value.includes("paper")) return "question_paper";
  if (value.includes("answer") && value.includes("key")) return "answer_key";
  if (value.includes("worked") || value.includes("explained") || value.includes("commentary")) return "worked_explanation";
  if (value.includes("paper")) return "question_paper";
  if (value.includes("guide") || value.includes("notes")) return "official_guide";
  if (value.includes("checklist") || value.includes("prep-plan")) return "preparation_checklist";
  if (value.includes("mark") && value.includes("scheme")) return "mark_scheme";
  return "official_document";
}

function mediaType(url: URL): "application/pdf" | "application/rtf" | null {
  const pathname = url.pathname.toLowerCase();
  if (pathname.endsWith(".pdf")) return "application/pdf";
  if (pathname.endsWith(".rtf")) return "application/rtf";
  return null;
}

function absoluteUrl(href: string, base: string): URL | null {
  try {
    const url = new URL(href, base);
    if (url.protocol === "http:") url.protocol = "https:";
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "Admission-Test-Breaker-Research-Archive/1.0" },
        signal: AbortSignal.timeout(90_000),
      });
      if (response.ok) return response;
      lastError = new Error(`${url}: HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Network request failed");
}

async function sync(): Promise<void> {
  await mkdir(path.join(rawRoot, "pages"), { recursive: true });
  const pageRecords: Array<Record<string, unknown>> = [];
  const candidates = new Map<string, {
    exam: ExamId;
    title: string;
    url: string;
    discoveredOn: Set<string>;
    rightsStatus: RightsStatus;
  }>();

  for (const source of sourcePages) {
    const response = await fetchWithRetry(source.url);
    const html = await response.text();
    const bytes = new TextEncoder().encode(html);
    const localPath = `content/official/raw/pages/${source.id}.html`;
    await writeFile(path.resolve(root, localPath), bytes);
    pageRecords.push({
      ...source,
      snapshotStatus: "downloaded",
      localPath,
      bytes: bytes.byteLength,
      sha256: hash(bytes),
      publishable: false,
    });

    const anchorPattern = /<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu;
    for (const match of html.matchAll(anchorPattern)) {
      const url = absoluteUrl(match[1] ?? "", source.url);
      if (url === null || mediaType(url) === null) continue;
      const key = url.toString();
      const existing = candidates.get(key);
      if (existing !== undefined) {
        existing.discoveredOn.add(source.id);
        continue;
      }
      candidates.set(key, {
        exam: source.exam,
        title: cleanText(match[2] ?? "") || safeFilename(url),
        url: key,
        discoveredOn: new Set([source.id]),
        rightsStatus: source.rightsStatus,
      });
    }
  }

  for (const direct of directAssets) {
    const existing = candidates.get(direct.url);
    if (existing !== undefined) {
      existing.discoveredOn.add(direct.discoveredOn);
    } else {
      candidates.set(direct.url, {
        exam: direct.exam,
        title: direct.title,
        url: direct.url,
        discoveredOn: new Set([direct.discoveredOn]),
        rightsStatus: direct.rightsStatus,
      });
    }
  }

  const assets: DiscoveredAsset[] = [];
  const queue = [...candidates.values()].sort((left, right) => left.url.localeCompare(right.url));
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < queue.length) {
      const candidate = queue[cursor++];
      if (candidate === undefined) return;
      const url = new URL(candidate.url);
      const filename = safeFilename(url);
      const type = mediaType(url)!;
      const localPath = `content/official/raw/${candidate.exam}/${filename}`;
      await mkdir(path.dirname(path.resolve(root, localPath)), { recursive: true });
      try {
        const response = await fetchWithRetry(candidate.url);
        const bytes = new Uint8Array(await response.arrayBuffer());
        const signature = new TextDecoder("latin1").decode(bytes.slice(0, 8));
        if (type === "application/pdf" && !signature.startsWith("%PDF-")) {
          throw new Error("Downloaded file does not have a PDF signature");
        }
        if (type === "application/rtf" && !signature.startsWith("{\\rtf")) {
          throw new Error("Downloaded file does not have an RTF signature");
        }
        await writeFile(path.resolve(root, localPath), bytes);
        assets.push({
          id: assetId(candidate.exam, filename, candidate.url),
          exam: candidate.exam,
          title: candidate.title,
          kind: classify(filename),
          url: candidate.url,
          discoveredOn: [...candidate.discoveredOn].sort(),
          rightsStatus: candidate.rightsStatus,
          publishable: false,
          localPath,
          mediaType: type,
          downloadStatus: "downloaded",
          bytes: bytes.byteLength,
          sha256: hash(bytes),
        });
      } catch (error) {
        assets.push({
          id: assetId(candidate.exam, filename, candidate.url),
          exam: candidate.exam,
          title: candidate.title,
          kind: classify(filename),
          url: candidate.url,
          discoveredOn: [...candidate.discoveredOn].sort(),
          rightsStatus: candidate.rightsStatus,
          publishable: false,
          localPath,
          mediaType: type,
          downloadStatus: "failed",
          bytes: null,
          sha256: null,
          error: error instanceof Error ? error.message : "Unknown download error",
        });
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, () => worker()));
  assets.sort((left, right) => left.id.localeCompare(right.id));

  const downloaded = assets.filter((asset) => asset.downloadStatus === "downloaded");
  const inventory = {
    schemaVersion: 1,
    syncedAt: new Date().toISOString(),
    policy: {
      purpose: "internal_research_only",
      rawFilesInPublicBundle: false,
      rawFilesTrackedByGit: false,
      downloadDoesNotGrantRepublicationRights: true,
      publicationRequiresSeparateWrittenPermissionOrLegalClearance: true,
    },
    summary: {
      sourcePages: pageRecords.length,
      discoveredDownloads: assets.length,
      downloaded: downloaded.length,
      failed: assets.length - downloaded.length,
      bytes: downloaded.reduce((total, asset) => total + (asset.bytes ?? 0), 0),
      byExam: Object.fromEntries(
        ["shared", "tmua", "esat", "tara", "lnat", "ucat"].map((exam) => [
          exam,
          downloaded.filter((asset) => asset.exam === exam).length,
        ]),
      ),
    },
    sourcePages: pageRecords,
    assets,
    interactiveResources: interactiveResources.map((resource) => ({
      ...resource,
      localDownload: false,
      delivery: "external_interactive_only",
      publishable: false,
    })),
  };
  await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

  if (assets.some((asset) => asset.downloadStatus === "failed")) {
    throw new Error(`${assets.filter((asset) => asset.downloadStatus === "failed").length} official assets failed to download`);
  }
  process.stdout.write(`Official research snapshot: ${pageRecords.length} pages, ${downloaded.length} files, ${inventory.summary.bytes} bytes\n`);
}

async function verify(): Promise<void> {
  const raw = JSON.parse(await readFile(inventoryPath, "utf8")) as {
    sourcePages: Array<{ localPath: string; bytes: number; sha256: string; publishable: boolean }>;
    assets: DiscoveredAsset[];
  };
  const records = [
    ...raw.sourcePages,
    ...raw.assets.filter((asset) => asset.downloadStatus === "downloaded"),
  ];
  for (const record of records) {
    if (record.publishable !== false || !record.localPath.startsWith("content/official/raw/")) {
      throw new Error(`Unsafe official research record: ${record.localPath}`);
    }
    await access(path.resolve(root, record.localPath));
    const bytes = new Uint8Array(await readFile(path.resolve(root, record.localPath)));
    const details = await stat(path.resolve(root, record.localPath));
    if (details.size !== record.bytes || hash(bytes) !== record.sha256) {
      throw new Error(`Checksum mismatch: ${record.localPath}`);
    }
  }
  process.stdout.write(`Verified ${records.length} local official research files\n`);
}

if (process.argv.includes("--verify")) {
  await verify();
} else {
  await sync();
}
