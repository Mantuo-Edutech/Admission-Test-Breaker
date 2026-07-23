import type { PracticeDeliveryService } from "./domain.js";

let testService: PracticeDeliveryService | undefined;

export async function resolvePracticeDeliveryService(
  configured: PracticeDeliveryService | undefined,
): Promise<PracticeDeliveryService | null> {
  if (configured !== undefined) return configured;
  if (import.meta.env.MODE !== "test") return null;
  testService ??= new (await import("./test-practice-delivery-service.js")).TestPracticeDeliveryService();
  return testService;
}
