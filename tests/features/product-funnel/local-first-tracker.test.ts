import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductFunnelEvent, ProductFunnelSink } from "../../../src/features/product-funnel/domain.js";
import {
  LocalFirstProductFunnelTracker,
  PRODUCT_FUNNEL_EVENT_KEY,
  PRODUCT_FUNNEL_JOURNEY_KEY,
} from "../../../src/features/product-funnel/local-first-tracker.js";

function storedEvents(): ProductFunnelEvent[] {
  return (JSON.parse(localStorage.getItem(PRODUCT_FUNNEL_EVENT_KEY) ?? "{}") as {
    events?: ProductFunnelEvent[];
  }).events ?? [];
}

function storedDeliveryStates(): Array<ProductFunnelEvent & { deliveredAt?: string }> {
  return (JSON.parse(localStorage.getItem(PRODUCT_FUNNEL_EVENT_KEY) ?? "{}") as {
    events?: Array<ProductFunnelEvent & { deliveredAt?: string }>;
  }).events ?? [];
}

describe("local-first product funnel tracker", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("stores a session-only journey and sends only the fixed event shape", async () => {
    const append = vi.fn<ProductFunnelSink["append"]>(async () => undefined);
    const tracker = new LocalFirstProductFunnelTracker(
      localStorage,
      sessionStorage,
      () => new Date("2026-07-19T08:00:00.000Z"),
      () => "fixed-id",
      { append },
    );

    await tracker.track({ eventType: "exam_selected", examId: "tmua", contextCode: "home-exam-selector" });

    expect(sessionStorage.getItem(PRODUCT_FUNNEL_JOURNEY_KEY)).toContain("journey_fixed-id");
    expect(append).toHaveBeenCalledWith({
      schemaVersion: 1,
      id: "fun_fixed-id",
      journeyId: "journey_fixed-id",
      occurredAt: "2026-07-19T08:00:00.000Z",
      eventType: "exam_selected",
      examId: "tmua",
      contextCode: "home-exam-selector",
    });
    expect(storedEvents()).toHaveLength(1);
    expect(JSON.stringify(storedEvents()[0])).not.toMatch(/email|answer|course|userId/iu);
  });

  it("deduplicates React remount-style repeats within three seconds", async () => {
    const append = vi.fn<ProductFunnelSink["append"]>(async () => undefined);
    const tracker = new LocalFirstProductFunnelTracker(
      localStorage,
      sessionStorage,
      () => new Date("2026-07-19T08:00:00.000Z"),
      () => `id-${append.mock.calls.length}`,
      { append },
    );
    const event = { eventType: "profile_completed", examId: "ucat", contextCode: "background-profile" } as const;

    await tracker.track(event);
    await tracker.track(event);

    expect(append).toHaveBeenCalledTimes(1);
    expect(storedEvents()).toHaveLength(1);
  });

  it("never blocks a learner action when remote aggregate delivery fails", async () => {
    const tracker = new LocalFirstProductFunnelTracker(
      localStorage,
      sessionStorage,
      () => new Date("2026-07-19T08:00:00.000Z"),
      () => "offline-id",
      { append: vi.fn(async () => { throw new Error("offline"); }) },
    );

    await expect(tracker.track({
      eventType: "practice_started",
      examId: "lnat",
      contextCode: "lnat-section-a-starter",
    })).resolves.toBeUndefined();
    expect(storedEvents()).toHaveLength(1);
  });

  it("retries an undelivered event before the next new event without double counting locally", async () => {
    let attempt = 0;
    const append = vi.fn<ProductFunnelSink["append"]>(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("temporary outage");
    });
    const randomIds = ["journey-seed", "first-event", "second-event"];
    let timestamp = 0;
    const tracker = new LocalFirstProductFunnelTracker(
      localStorage,
      sessionStorage,
      () => new Date(`2026-07-19T08:00:0${timestamp++}.000Z`),
      () => randomIds.shift() ?? "fallback-id",
      { append },
    );

    await tracker.track({
      eventType: "practice_started",
      examId: "tmua",
      contextCode: "specimen-paper-1",
    });
    await tracker.track({
      eventType: "practice_completed",
      examId: "tmua",
      contextCode: "specimen-paper-1",
    });

    expect(append).toHaveBeenCalledTimes(3);
    expect(append.mock.calls.map(([event]) => event.eventType)).toEqual([
      "practice_started",
      "practice_started",
      "practice_completed",
    ]);
    expect(storedDeliveryStates()).toHaveLength(2);
    expect(storedDeliveryStates().every((event) => event.deliveredAt !== undefined)).toBe(true);
  });
});
