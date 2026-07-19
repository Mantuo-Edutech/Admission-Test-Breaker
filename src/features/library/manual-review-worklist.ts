import type {
  ContentReleaseReadinessReport,
  ReleaseManualCheck,
} from "./content-release-readiness.js";

export type ManualReviewCampaignId =
  | "academic-content"
  | "student-calibration"
  | "device-accessibility";

export interface ManualReviewCatalogProduct {
  readonly id: string;
  readonly examId: string;
  readonly version: string;
  readonly route?: string;
}

export interface ManualReviewProductScope {
  readonly productId: string;
  readonly examId: string;
  readonly version: string;
  readonly route: string;
}

export interface ManualReviewWorkItem {
  readonly reviewKey: string;
  readonly campaignId: ManualReviewCampaignId;
  readonly featureId: string;
  readonly featureManifest: string;
  readonly manualCheckId: string;
  readonly status: "pending";
  readonly ownerRole: string;
  readonly independenceRequired: boolean;
  readonly evidenceRequirement: string;
  readonly viewports: readonly string[];
  readonly products: readonly ManualReviewProductScope[];
  readonly sourceFingerprint?: string;
  readonly sourceArtifactCount?: number;
}

export interface ManualReviewCampaign {
  readonly id: ManualReviewCampaignId;
  readonly label: string;
  readonly ownerRole: string;
  readonly exitCriteria: readonly string[];
  readonly items: readonly ManualReviewWorkItem[];
}

export interface ManualReviewWorklist {
  readonly schemaVersion: 1;
  readonly policyVersion: "1.0.0";
  readonly catalogRevision: string;
  readonly sourceReleasePolicyVersion: string;
  readonly generatedAt: string;
  readonly instructions: readonly string[];
  readonly summary: {
    readonly pendingReviewItems: number;
    readonly affectedPublicProducts: number;
    readonly academicContentItems: number;
    readonly studentCalibrationItems: number;
    readonly deviceAccessibilityItems: number;
  };
  readonly campaigns: readonly ManualReviewCampaign[];
}

interface CampaignPolicy {
  readonly id: ManualReviewCampaignId;
  readonly label: string;
  readonly ownerRole: string;
  readonly exitCriteria: readonly string[];
}

const CAMPAIGN_POLICIES: readonly CampaignPolicy[] = [
  {
    id: "academic-content",
    label: "独立学科、双语与权利审核",
    ownerRole: "content-review-lead",
    exitCriteria: [
      "由未参与原始编写的适任审核人完成逐项检查。",
      "证据记录覆盖答案、措辞、术语、相似度或专业判断中适用的部分。",
      "对应 feature manifest 写入 reviewer、reviewerRole、checkedAt 和最终 evidence 后才能改为 passed。",
    ],
  },
  {
    id: "student-calibration",
    label: "真实学生理解度与用时标定",
    ownerRole: "student-research-lead",
    exitCriteria: [
      "记录样本课程体系、人数、设备和任务版本，不保存无关个人资料。",
      "报告完成时间、理解障碍和限制；样本不足时保持事实型结果，不发布 Benchmark。",
      "对应 feature manifest 写入 reviewer、reviewerRole、checkedAt 和证据摘要后才能改为 passed。",
    ],
  },
  {
    id: "device-accessibility",
    label: "真机、响应式与无障碍验收",
    ownerRole: "interface-qa-lead",
    exitCriteria: [
      "按工作项列出的全部路由和视口完成真实浏览器或设备矩阵。",
      "检查横向溢出、键盘、触控、可读性、公式/表格/长文和 reduced-motion 中适用的部分。",
      "保存设备矩阵、问题单或审核记录；自动 E2E 不能替代本项人工签字。",
    ],
  },
] as const;

function campaignFor(check: ReleaseManualCheck): CampaignPolicy {
  if (check.id.startsWith("independent-")) {
    return CAMPAIGN_POLICIES[0]!;
  }
  if (check.id.includes("student-comprehension") || check.id.includes("timing-calibration")) {
    return CAMPAIGN_POLICIES[1]!;
  }
  return CAMPAIGN_POLICIES[2]!;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function buildManualReviewWorklist(input: {
  readonly report: ContentReleaseReadinessReport;
  readonly catalogProducts: readonly ManualReviewCatalogProduct[];
}): ManualReviewWorklist {
  const catalog = new Map(input.catalogProducts.map((product) => [product.id, product]));
  const grouped = new Map<string, {
    check: ReleaseManualCheck;
    featureId: string;
    featureManifest: string;
    products: ManualReviewProductScope[];
  }>();

  for (const product of input.report.products.filter((item) => item.visibility === "public")) {
    const catalogProduct = catalog.get(product.productId);
    if (catalogProduct === undefined) throw new Error(`${product.productId} is missing from catalog`);
    if (product.featureId === null || product.featureManifest === null) {
      throw new Error(`${product.productId} cannot enter a manual worklist without a feature manifest`);
    }
    if (!catalogProduct.route?.startsWith("/")) {
      throw new Error(`${product.productId} cannot enter a manual worklist without an internal route`);
    }

    for (const check of product.pendingManualChecks) {
      const reviewKey = `${product.featureId}/${check.id}`;
      const existing = grouped.get(reviewKey);
      const scope: ManualReviewProductScope = {
        productId: product.productId,
        examId: product.examId,
        version: catalogProduct.version,
        route: catalogProduct.route,
      };
      if (existing === undefined) {
        grouped.set(reviewKey, {
          check,
          featureId: product.featureId,
          featureManifest: product.featureManifest,
          products: [scope],
        });
      } else {
        if (existing.featureManifest !== product.featureManifest) {
          throw new Error(`${reviewKey} resolves to multiple feature manifests`);
        }
        existing.products.push(scope);
      }
    }
  }

  const items = [...grouped.entries()].map(([reviewKey, value]): ManualReviewWorkItem => {
    const campaign = campaignFor(value.check);
    return {
      reviewKey,
      campaignId: campaign.id,
      featureId: value.featureId,
      featureManifest: value.featureManifest,
      manualCheckId: value.check.id,
      status: "pending",
      ownerRole: campaign.ownerRole,
      independenceRequired: campaign.id !== "device-accessibility",
      evidenceRequirement: value.check.evidence?.trim() || "Record the review scope, findings and approval decision.",
      viewports: uniqueSorted(value.check.viewports ?? []),
      products: [...value.products].sort((left, right) => left.productId.localeCompare(right.productId)),
    };
  }).sort((left, right) => left.reviewKey.localeCompare(right.reviewKey));

  const campaigns = CAMPAIGN_POLICIES.map((policy): ManualReviewCampaign => ({
    ...policy,
    items: items.filter((item) => item.campaignId === policy.id),
  }));
  const affectedPublicProducts = new Set(
    items.flatMap((item) => item.products.map((product) => product.productId)),
  ).size;
  const count = (campaignId: ManualReviewCampaignId): number =>
    items.filter((item) => item.campaignId === campaignId).length;

  return {
    schemaVersion: 1,
    policyVersion: "1.0.0",
    catalogRevision: input.report.catalogRevision,
    sourceReleasePolicyVersion: input.report.policyVersion,
    generatedAt: input.report.assessedAt,
    instructions: [
      "This file is generated; do not mark an item passed here.",
      "Complete the stated review, then update the owning feature manifest with status, reviewer, reviewerRole, checkedAt and evidence.",
      "Rebuild release-readiness first, then rebuild this worklist; stale or missing coverage fails verification.",
    ],
    summary: {
      pendingReviewItems: items.length,
      affectedPublicProducts,
      academicContentItems: count("academic-content"),
      studentCalibrationItems: count("student-calibration"),
      deviceAccessibilityItems: count("device-accessibility"),
    },
    campaigns,
  };
}
