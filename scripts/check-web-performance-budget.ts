import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const DIST_DIRECTORY = path.resolve("dist");
const INDEX_PATH = path.join(DIST_DIRECTORY, "index.html");

const PERFORMANCE_BUDGET = {
  entryJavascriptBytes: 500_000,
  entryJavascriptGzipBytes: 145_000,
  initialJavascriptGzipBytes: 180_000,
  initialJavascriptAndCssGzipBytes: 220_000,
  nonEntryJavascriptBytes: 300_000,
} as const;

interface AssetMeasurement {
  relativePath: string;
  bytes: number;
  gzipBytes: number;
}

function localAssetPath(url: string): string | null {
  if (/^(?:https?:)?\/\//u.test(url) || url.startsWith("data:")) return null;
  const pathname = url.split(/[?#]/u, 1)[0];
  if (pathname === undefined || pathname === "") return null;
  return pathname.replace(/^\//u, "");
}

function attributeUrls(html: string, element: "script" | "link", attribute: "src" | "href"): string[] {
  const pattern = new RegExp(`<${element}\\b[^>]*\\b${attribute}=["']([^"']+)["'][^>]*>`, "giu");
  return [...html.matchAll(pattern)]
    .map((match) => match[1])
    .filter((value): value is string => value !== undefined);
}

async function measure(relativePath: string): Promise<AssetMeasurement> {
  const contents = await readFile(path.join(DIST_DIRECTORY, relativePath));
  return {
    relativePath,
    bytes: contents.byteLength,
    gzipBytes: gzipSync(contents, { level: 9 }).byteLength,
  };
}

function formatKiB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

async function main(): Promise<void> {
  const html = await readFile(INDEX_PATH, "utf8");
  const entryMatch = html.match(/<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["'][^>]*>/iu);
  if (entryMatch?.[1] === undefined) {
    throw new Error("dist/index.html does not declare a module entry script");
  }

  const entryPath = localAssetPath(entryMatch[1]);
  if (entryPath === null) throw new Error("The module entry must be a local asset");

  const initialPaths = new Set(
    [
      ...attributeUrls(html, "script", "src"),
      ...attributeUrls(html, "link", "href"),
    ]
      .map(localAssetPath)
      .filter((value): value is string => value !== null)
      .filter((value) => /\.(?:js|css)$/u.test(value)),
  );
  const initialAssets = await Promise.all([...initialPaths].sort().map(measure));
  const entry = initialAssets.find((asset) => asset.relativePath === entryPath)
    ?? await measure(entryPath);
  const initialJavascript = initialAssets.filter((asset) => asset.relativePath.endsWith(".js"));
  const initialStylesheets = initialAssets.filter((asset) => asset.relativePath.endsWith(".css"));

  const assetFiles = await readdir(path.join(DIST_DIRECTORY, "assets"));
  const javascriptChunks = await Promise.all(
    assetFiles
      .filter((file) => file.endsWith(".js"))
      .sort()
      .map((file) => measure(path.posix.join("assets", file))),
  );
  const nonEntryChunks = javascriptChunks.filter((asset) => asset.relativePath !== entryPath);
  const largestNonEntry = nonEntryChunks.reduce<AssetMeasurement | null>(
    (largest, asset) => largest === null || asset.bytes > largest.bytes ? asset : largest,
    null,
  );

  const initialJavascriptGzipBytes = initialJavascript.reduce((total, asset) => total + asset.gzipBytes, 0);
  const initialStylesheetGzipBytes = initialStylesheets.reduce((total, asset) => total + asset.gzipBytes, 0);
  const initialTotalGzipBytes = initialJavascriptGzipBytes + initialStylesheetGzipBytes;
  const violations: string[] = [];

  if (entry.bytes > PERFORMANCE_BUDGET.entryJavascriptBytes) {
    violations.push(`entry JavaScript ${formatKiB(entry.bytes)} exceeds ${formatKiB(PERFORMANCE_BUDGET.entryJavascriptBytes)}`);
  }
  if (entry.gzipBytes > PERFORMANCE_BUDGET.entryJavascriptGzipBytes) {
    violations.push(`entry JavaScript gzip ${formatKiB(entry.gzipBytes)} exceeds ${formatKiB(PERFORMANCE_BUDGET.entryJavascriptGzipBytes)}`);
  }
  if (initialJavascriptGzipBytes > PERFORMANCE_BUDGET.initialJavascriptGzipBytes) {
    violations.push(`initial JavaScript gzip ${formatKiB(initialJavascriptGzipBytes)} exceeds ${formatKiB(PERFORMANCE_BUDGET.initialJavascriptGzipBytes)}`);
  }
  if (initialTotalGzipBytes > PERFORMANCE_BUDGET.initialJavascriptAndCssGzipBytes) {
    violations.push(`initial JavaScript + CSS gzip ${formatKiB(initialTotalGzipBytes)} exceeds ${formatKiB(PERFORMANCE_BUDGET.initialJavascriptAndCssGzipBytes)}`);
  }
  if (largestNonEntry !== null && largestNonEntry.bytes > PERFORMANCE_BUDGET.nonEntryJavascriptBytes) {
    violations.push(`${largestNonEntry.relativePath} ${formatKiB(largestNonEntry.bytes)} exceeds the non-entry chunk budget ${formatKiB(PERFORMANCE_BUDGET.nonEntryJavascriptBytes)}`);
  }

  console.info("Web performance budget");
  console.info(`  Entry JavaScript: ${formatKiB(entry.bytes)} raw / ${formatKiB(entry.gzipBytes)} gzip`);
  console.info(`  Initial JavaScript: ${formatKiB(initialJavascriptGzipBytes)} gzip across ${initialJavascript.length} assets`);
  console.info(`  Initial CSS: ${formatKiB(initialStylesheetGzipBytes)} gzip across ${initialStylesheets.length} assets`);
  console.info(`  Initial JS + CSS: ${formatKiB(initialTotalGzipBytes)} gzip`);
  if (largestNonEntry !== null) {
    console.info(`  Largest non-entry chunk: ${largestNonEntry.relativePath} (${formatKiB(largestNonEntry.bytes)})`);
  }

  if (violations.length > 0) {
    throw new Error(`Web performance budget failed:\n- ${violations.join("\n- ")}`);
  }
  console.info("  Result: PASS");
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
