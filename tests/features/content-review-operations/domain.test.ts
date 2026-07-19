import { describe, expect, it } from "vitest";
import {
  contentReviewExamIds,
  createContentReviewPacket,
  filterContentReviewQueue,
  type ContentReviewQueueItem,
} from "../../../src/features/content-review-operations/domain.js";

const academic: ContentReviewQueueItem = {
  reviewKey: "tmua-complete-online-paper-practice/independent-mathematics-review",
  campaignId: "academic-content",
  ownerRole: "content-review-lead",
  independenceRequired: true,
  evidenceRequirement: "An independent mathematics teacher must verify every answer and prompt.",
  viewports: ["content"],
  products: [{
    productId: "tmua-past-papers",
    examId: "tmua",
    version: "1.0.0",
    route: "/exams/tmua/past-papers",
  }],
  sourceFingerprint: `sha256:${"a".repeat(64)}`,
  sourceArtifactCount: 18,
  catalogRevision: "2026-07-19.33",
};

const device: ContentReviewQueueItem = {
  ...academic,
  reviewKey: "esat-full-mock/device-accessibility",
  campaignId: "device-accessibility",
  ownerRole: "interface-qa-lead",
  independenceRequired: false,
  products: [{
    productId: "esat-mathematics-1-full-mock",
    examId: "esat",
    version: "1.0.0",
    route: "/practice/esat-mathematics-1-full-mock-v1",
  }],
};

describe("content review operations domain", () => {
  it("filters one server-delivered queue by campaign and exam", () => {
    expect(filterContentReviewQueue([academic, device], {
      campaignId: "academic-content",
      examId: "tmua",
    })).toEqual([academic]);
    expect(filterContentReviewQueue([academic, device], {
      campaignId: "all",
      examId: "esat",
    })).toEqual([device]);
    expect(contentReviewExamIds([device, academic])).toEqual(["esat", "tmua"]);
  });

  it("builds a current-source review packet without inventing approval", () => {
    const packet = createContentReviewPacket(academic, new Date("2026-07-19T08:30:00.000Z"));
    const decision = JSON.parse(packet.decisionDraft) as Record<string, unknown>;

    expect(packet.evidenceFileName).toMatch(/2026-07-19--evidence\.md$/u);
    expect(packet.evidenceMarkdown).toContain(academic.sourceFingerprint);
    expect(packet.evidenceMarkdown).toContain("没有写入学生姓名、联系方式或原始作答");
    expect(decision).toMatchObject({
      reviewKey: academic.reviewKey,
      sourceFingerprint: academic.sourceFingerprint,
      outcome: "changes-requested",
      attested: false,
    });
    expect(packet.decisionDraft).toContain("replace-after-the-report-is-final");
  });
});
