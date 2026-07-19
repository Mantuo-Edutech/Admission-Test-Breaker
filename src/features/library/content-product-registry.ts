import rawCatalog from "../../../content/products/catalog.json" with { type: "json" };
import type { ExamId } from "../catalog/exams.js";

export type ContentProductKind =
  | "practice-library"
  | "coverage-map"
  | "review-notes"
  | "admissions-planner"
  | "preparation-map"
  | "exam-guide";
export type ContentProductStatus = "published" | "teaching-preview" | "internal-review";
export type ContentProductAccess = "public" | "profile" | "invite" | "internal";

export interface ContentProductMetric {
  readonly label: string;
  readonly value: string;
}

export interface ContentProduct {
  readonly id: string;
  readonly version: string;
  readonly lastVerifiedAt: string;
  readonly examId: ExamId;
  readonly kind: ContentProductKind;
  readonly title: { readonly zh: string; readonly en: string };
  readonly summary: string;
  readonly status: ContentProductStatus;
  readonly visibility: "public" | "internal";
  readonly access: ContentProductAccess;
  readonly packageIds?: readonly string[];
  readonly relatedPracticeIds?: readonly string[];
  readonly actionLabel?: string;
  readonly delivery: "native-online" | "native-page" | "native-page-and-pdf";
  readonly rightsBasis: "mantou-original" | "official-facts-derived" | "verified-source-index";
  readonly route?: string;
  readonly download?: string;
  readonly metrics: readonly ContentProductMetric[];
  readonly evidence: readonly string[];
}

interface ContentProductCatalog {
  readonly schemaVersion: 1;
  readonly revision: string;
  readonly products: readonly ContentProduct[];
}

const examIds: readonly ExamId[] = ["tmua", "esat", "tara", "lnat", "ucat"];
const kinds: readonly ContentProductKind[] = [
  "practice-library",
  "coverage-map",
  "review-notes",
  "admissions-planner",
  "preparation-map",
  "exam-guide",
];
const statuses: readonly ContentProductStatus[] = ["published", "teaching-preview", "internal-review"];
const accesses: readonly ContentProductAccess[] = ["public", "profile", "invite", "internal"];
const deliveries: readonly ContentProduct["delivery"][] = ["native-online", "native-page", "native-page-and-pdf"];
const rightsBases: readonly ContentProduct["rightsBasis"][] = ["mantou-original", "official-facts-derived", "verified-source-index"];

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function safeInternalPath(value: unknown): value is string {
  return nonEmpty(value) && value.startsWith("/") && !value.startsWith("//") && !value.includes("..") && !/^\/https?:/u.test(value);
}

function safeEvidencePath(value: unknown): value is string {
  return nonEmpty(value) && !value.startsWith("/") && !value.split(/[\\/]/u).includes("..");
}

function productVersion(value: unknown): value is string {
  return nonEmpty(value) && /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/u.test(value);
}

function isoDate(value: unknown): value is string {
  return nonEmpty(value) && /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

function parseProduct(value: unknown, index: number): ContentProduct {
  const label = `products.${index}`;
  assertRecord(value, label);
  assertRecord(value.title, `${label}.title`);
  if (
    !nonEmpty(value.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value.id) ||
    !productVersion(value.version) || !isoDate(value.lastVerifiedAt) ||
    typeof value.examId !== "string" || !examIds.includes(value.examId as ExamId) ||
    typeof value.kind !== "string" || !kinds.includes(value.kind as ContentProductKind) ||
    !nonEmpty(value.title.zh) || !nonEmpty(value.title.en) || !nonEmpty(value.summary) ||
    typeof value.status !== "string" || !statuses.includes(value.status as ContentProductStatus) ||
    (value.visibility !== "public" && value.visibility !== "internal") ||
    typeof value.access !== "string" || !accesses.includes(value.access as ContentProductAccess) ||
    typeof value.delivery !== "string" || !deliveries.includes(value.delivery as ContentProduct["delivery"]) ||
    typeof value.rightsBasis !== "string" || !rightsBases.includes(value.rightsBasis as ContentProduct["rightsBasis"]) ||
    !Array.isArray(value.metrics) || value.metrics.length === 0 ||
    !Array.isArray(value.evidence) || value.evidence.length === 0 || !value.evidence.every(safeEvidencePath)
  ) {
    throw new Error(`${label} is invalid`);
  }

  const metrics = value.metrics.map((metric, metricIndex) => {
    assertRecord(metric, `${label}.metrics.${metricIndex}`);
    if (!nonEmpty(metric.label) || !nonEmpty(metric.value)) {
      throw new Error(`${label}.metrics.${metricIndex} is invalid`);
    }
    return { label: metric.label, value: metric.value };
  });

  const route = value.route;
  const download = value.download;
  const packageIds = value.packageIds;
  const relatedPracticeIds = value.relatedPracticeIds;
  const actionLabel = value.actionLabel;
  if (route !== undefined && !safeInternalPath(route)) throw new Error(`${label}.route must be internal`);
  if (download !== undefined && !safeInternalPath(download)) throw new Error(`${label}.download must be internal`);
  if (value.delivery === "native-page-and-pdf" && !safeInternalPath(download)) {
    throw new Error(`${label} PDF products require an internal download`);
  }
  if (download !== undefined && value.delivery !== "native-page-and-pdf") {
    throw new Error(`${label} download requires native-page-and-pdf delivery`);
  }
  if (value.visibility === "public" && !safeInternalPath(route)) throw new Error(`${label} public products require an internal route`);
  if (value.access === "internal" && value.visibility !== "internal") {
    throw new Error(`${label} internal access requires internal visibility`);
  }
  if (
    value.access === "invite" &&
    (!Array.isArray(packageIds) || packageIds.length === 0 || !packageIds.every(nonEmpty))
  ) {
    throw new Error(`${label} invite products require packageIds`);
  }
  if (Array.isArray(packageIds) && new Set(packageIds).size !== packageIds.length) {
    throw new Error(`${label}.packageIds must be unique`);
  }
  if (
    relatedPracticeIds !== undefined &&
    (!Array.isArray(relatedPracticeIds) ||
      relatedPracticeIds.length === 0 ||
      !relatedPracticeIds.every((practiceId) =>
        nonEmpty(practiceId) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(practiceId)))
  ) {
    throw new Error(`${label}.relatedPracticeIds must contain practice IDs`);
  }
  if (Array.isArray(relatedPracticeIds) && new Set(relatedPracticeIds).size !== relatedPracticeIds.length) {
    throw new Error(`${label}.relatedPracticeIds must be unique`);
  }
  if (relatedPracticeIds !== undefined && value.kind !== "review-notes") {
    throw new Error(`${label}.relatedPracticeIds are only valid for review products`);
  }
  if (actionLabel !== undefined && !nonEmpty(actionLabel)) {
    throw new Error(`${label}.actionLabel must be a non-empty string`);
  }
  if (value.visibility === "public" && value.status === "internal-review") throw new Error(`${label} internal-review products cannot be public`);

  return {
    id: value.id,
    version: value.version,
    lastVerifiedAt: value.lastVerifiedAt,
    examId: value.examId as ExamId,
    kind: value.kind as ContentProductKind,
    title: { zh: value.title.zh, en: value.title.en },
    summary: value.summary,
    status: value.status as ContentProductStatus,
    visibility: value.visibility,
    access: value.access as ContentProductAccess,
    ...(Array.isArray(packageIds) ? { packageIds: packageIds as string[] } : {}),
    ...(Array.isArray(relatedPracticeIds)
      ? { relatedPracticeIds: relatedPracticeIds as string[] }
      : {}),
    ...(nonEmpty(actionLabel) ? { actionLabel } : {}),
    delivery: value.delivery as ContentProduct["delivery"],
    rightsBasis: value.rightsBasis as ContentProduct["rightsBasis"],
    ...(safeInternalPath(route) ? { route } : {}),
    ...(safeInternalPath(download) ? { download } : {}),
    metrics,
    evidence: value.evidence,
  };
}

function parseCatalog(value: unknown): ContentProductCatalog {
  assertRecord(value, "Content product catalog");
  if (value.schemaVersion !== 1 || !nonEmpty(value.revision) || !/^\d{4}-\d{2}-\d{2}\.\d+$/u.test(value.revision) || !Array.isArray(value.products)) {
    throw new Error("Content product catalog header is invalid");
  }
  const products = value.products.map(parseProduct);
  if (new Set(products.map((product) => product.id)).size !== products.length) {
    throw new Error("Content product IDs must be unique");
  }
  return { schemaVersion: 1, revision: value.revision, products };
}

export const CONTENT_PRODUCT_CATALOG = parseCatalog(rawCatalog);

export function publicContentProducts(examId?: ExamId): readonly ContentProduct[] {
  return CONTENT_PRODUCT_CATALOG.products.filter(
    (product) => product.visibility === "public" && (examId === undefined || product.examId === examId),
  );
}

export function internalContentProducts(): readonly ContentProduct[] {
  return CONTENT_PRODUCT_CATALOG.products.filter((product) => product.visibility === "internal");
}

export function inviteContentProductsForPackages(
  packageIds: readonly string[],
): readonly ContentProduct[] {
  const grantedPackages = new Set(packageIds);
  if (grantedPackages.size === 0) return [];

  return publicContentProducts().filter(
    (product) =>
      product.access === "invite" &&
      product.packageIds?.some((packageId) => grantedPackages.has(packageId)) === true,
  );
}

export function reviewContentProductsForPractice(
  practiceId: string,
): readonly ContentProduct[] {
  return publicContentProducts().filter(
    (product) =>
      product.kind === "review-notes" &&
      product.relatedPracticeIds?.includes(practiceId) === true,
  );
}
