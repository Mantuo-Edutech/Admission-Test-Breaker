export const CONTENT_REVIEW_CAMPAIGNS = [
  "academic-content",
  "student-calibration",
  "device-accessibility",
] as const;

export type ContentReviewCampaignId = (typeof CONTENT_REVIEW_CAMPAIGNS)[number];

export interface ContentReviewOperationsContext {
  readonly active: boolean;
  readonly displayName: string | null;
  readonly permissions: readonly string[];
}

export interface ContentReviewProductScope {
  readonly productId: string;
  readonly examId: string;
  readonly version: string;
  readonly route: string;
}

export interface ContentReviewQueueItem {
  readonly reviewKey: string;
  readonly campaignId: ContentReviewCampaignId;
  readonly ownerRole: string;
  readonly independenceRequired: boolean;
  readonly evidenceRequirement: string;
  readonly viewports: readonly string[];
  readonly products: readonly ContentReviewProductScope[];
  readonly sourceFingerprint: string;
  readonly sourceArtifactCount: number;
  readonly catalogRevision: string;
}

export interface ContentReviewQueueSummary {
  readonly catalogRevision: string | null;
  readonly pendingReviewItems: number;
  readonly affectedPublicProducts: number;
  readonly academicContentItems: number;
  readonly studentCalibrationItems: number;
  readonly deviceAccessibilityItems: number;
}

export interface ContentReviewOperationsService {
  readonly configured: true;
  getContext(): Promise<ContentReviewOperationsContext>;
  loadSummary(): Promise<ContentReviewQueueSummary>;
  listQueue(campaignId?: ContentReviewCampaignId): Promise<readonly ContentReviewQueueItem[]>;
}

export const CONTENT_REVIEW_CAMPAIGN_LABELS: Readonly<Record<ContentReviewCampaignId, {
  readonly zh: string;
  readonly en: string;
  readonly description: string;
}>> = {
  "academic-content": {
    zh: "学科、双语与权利审核",
    en: "ACADEMIC & RIGHTS",
    description: "核对题目、答案、术语、专业判断与内容相似度。",
  },
  "student-calibration": {
    zh: "真实学生理解与用时标定",
    en: "STUDENT CALIBRATION",
    description: "记录真实学生的理解障碍和用时，不保存无关个人信息。",
  },
  "device-accessibility": {
    zh: "真机与无障碍验收",
    en: "DEVICE & ACCESSIBILITY",
    description: "验证电脑、iPad、手机、键盘、触控和内容可读性。",
  },
};

export interface ContentReviewPacket {
  readonly baseName: string;
  readonly evidenceFileName: string;
  readonly decisionFileName: string;
  readonly evidenceMarkdown: string;
  readonly decisionDraft: string;
}

function safeSlug(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("/", "--")
    .replace(/[^a-z0-9._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 90);
}

function localDate(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createContentReviewPacket(
  item: ContentReviewQueueItem,
  now: Date,
): ContentReviewPacket {
  const date = localDate(now);
  const baseName = `${safeSlug(item.reviewKey)}--${date}`;
  const evidenceFileName = `${baseName}--evidence.md`;
  const decisionFileName = `${baseName}--decision-draft.json`;
  const repositoryEvidencePath = `verification/reviews/evidence/${evidenceFileName}`;
  const productScope = item.products
    .map((product) => `- ${product.productId} · ${product.version} · ${product.route}`)
    .join("\n");
  const modes = item.viewports.length > 0
    ? item.viewports.map((viewport) => `- ${viewport}`).join("\n")
    : "- 按审核要求覆盖完整内容范围";
  const evidenceMarkdown = `# 满托内容审核记录 / Mantou content review\n\n`
    + `- Review key: \`${item.reviewKey}\`\n`
    + `- Campaign: \`${item.campaignId}\`\n`
    + `- Required owner role: \`${item.ownerRole}\`\n`
    + `- Catalog revision: \`${item.catalogRevision}\`\n`
    + `- Source fingerprint: \`${item.sourceFingerprint}\`\n`
    + `- Source artifacts: ${item.sourceArtifactCount}\n\n`
    + `## 审核要求 / Requirement\n\n${item.evidenceRequirement}\n\n`
    + `## 产品与页面 / Product and route scope\n\n${productScope}\n\n`
    + `## 设备或审核模式 / Modes\n\n${modes}\n\n`
    + `## 审核人 / Reviewers\n\n使用不包含姓名、邮箱、电话的角色编号；说明专业资质及是否独立于原作者。\n\n`
    + `## 已执行检查 / Checks performed\n\n`
    + `- [ ] 覆盖全部指定产品、版本和页面。\n`
    + `- [ ] 记录发现的问题及修复结果。\n`
    + `- [ ] 记录仍存在的限制。\n`
    + `- [ ] 确认没有写入学生姓名、联系方式或原始作答。\n\n`
    + `## 发现与修复 / Findings and resolutions\n\n请填写具体发现。\n\n`
    + `## 剩余限制 / Limitations\n\n请填写限制；如审核范围内没有遗留问题，请明确说明。\n\n`
    + `## 结论 / Recommendation\n\n选择 approve 或 request changes，并说明理由。\n`;
  const decision = {
    schemaVersion: 1,
    decisionId: `${safeSlug(item.reviewKey).slice(0, 55)}-${date}-01`,
    reviewKey: item.reviewKey,
    sourceFingerprint: item.sourceFingerprint,
    outcome: "changes-requested",
    reviewedAt: date,
    recordedAt: now.toISOString(),
    reviewLead: {
      reference: "replace-with-role-reference",
      role: item.ownerRole,
    },
    reviewers: [{
      reference: "replace-with-reviewer-reference",
      role: "replace-with-qualified-role",
      independent: item.independenceRequired,
    }],
    evidence: {
      summary: "Replace with a concrete summary of checks, findings and the final decision.",
      artifacts: [{
        path: repositoryEvidencePath,
        sha256: "replace-after-the-report-is-final",
      }],
    },
    attested: false,
  };
  return {
    baseName,
    evidenceFileName,
    decisionFileName,
    evidenceMarkdown,
    decisionDraft: `${JSON.stringify(decision, null, 2)}\n`,
  };
}

export function contentReviewExamIds(items: readonly ContentReviewQueueItem[]): readonly string[] {
  return [...new Set(items.flatMap((item) => item.products.map((product) => product.examId)))]
    .sort((left, right) => left.localeCompare(right));
}

export function filterContentReviewQueue(
  items: readonly ContentReviewQueueItem[],
  filters: { readonly campaignId: ContentReviewCampaignId | "all"; readonly examId: string | "all" },
): readonly ContentReviewQueueItem[] {
  return items.filter((item) => (
    (filters.campaignId === "all" || item.campaignId === filters.campaignId)
    && (filters.examId === "all" || item.products.some((product) => product.examId === filters.examId))
  ));
}
