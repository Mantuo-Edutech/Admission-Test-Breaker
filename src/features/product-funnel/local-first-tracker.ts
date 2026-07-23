import {
  assertProductFunnelEventInput,
  type ProductFunnelEvent,
  type ProductFunnelEventInput,
  type ProductFunnelSink,
  type ProductFunnelTracker,
} from "./domain.js";

export const PRODUCT_FUNNEL_JOURNEY_KEY = "mantuo.product-funnel-journey.v1";
export const PRODUCT_FUNNEL_EVENT_KEY = "mantuo.product-funnel-events.v1";

interface StoredFunnelEvent extends ProductFunnelEvent {
  readonly deliveredAt?: string;
}

interface StoredFunnelEvents {
  readonly schemaVersion: 1;
  readonly events: readonly StoredFunnelEvent[];
}

interface StoredJourney {
  readonly schemaVersion: 1;
  readonly id: ProductFunnelEvent["journeyId"];
  readonly createdAt: string;
}

function readStoredEvents(storage: Storage): StoredFunnelEvents {
  try {
    const raw = storage.getItem(PRODUCT_FUNNEL_EVENT_KEY);
    if (raw === null) return { schemaVersion: 1, events: [] };
    const value = JSON.parse(raw) as Partial<StoredFunnelEvents>;
    if (value.schemaVersion !== 1 || !Array.isArray(value.events)) {
      return { schemaVersion: 1, events: [] };
    }
    return {
      schemaVersion: 1,
      events: value.events.filter((event): event is StoredFunnelEvent =>
        typeof event === "object" && event !== null && event.schemaVersion === 1,
      ).slice(-100),
    };
  } catch {
    return { schemaVersion: 1, events: [] };
  }
}

function writeStoredEvents(storage: Storage, events: readonly StoredFunnelEvent[]): void {
  storage.setItem(PRODUCT_FUNNEL_EVENT_KEY, JSON.stringify({
    schemaVersion: 1,
    events: events.slice(-100),
  } satisfies StoredFunnelEvents));
}

export class LocalFirstProductFunnelTracker implements ProductFunnelTracker {
  constructor(
    private readonly localStorage: Storage,
    private readonly sessionStorage: Storage,
    private readonly now: () => Date,
    private readonly randomId: () => string,
    private readonly sink?: ProductFunnelSink,
  ) {}

  private journeyId(): ProductFunnelEvent["journeyId"] {
    const current = this.sessionStorage.getItem(PRODUCT_FUNNEL_JOURNEY_KEY);
    if (current !== null) {
      try {
        const parsed = JSON.parse(current) as Partial<StoredJourney>;
        if (parsed.schemaVersion === 1 && typeof parsed.id === "string" && /^journey_[A-Za-z0-9_-]+$/u.test(parsed.id)) {
          return parsed.id as ProductFunnelEvent["journeyId"];
        }
      } catch {
        // Replace corrupt, non-identifying session metadata below.
      }
    }
    const createdAt = this.now().toISOString();
    const id = `journey_${this.randomId()}` as ProductFunnelEvent["journeyId"];
    this.sessionStorage.setItem(PRODUCT_FUNNEL_JOURNEY_KEY, JSON.stringify({
      schemaVersion: 1,
      id,
      createdAt,
    } satisfies StoredJourney));
    return id;
  }

  private async deliverPending(fallbackEvent: StoredFunnelEvent): Promise<void> {
    if (this.sink === undefined) return;

    const stored = readStoredEvents(this.localStorage);
    const pending = stored.events.filter((event) => event.deliveredAt === undefined).slice(0, 10);
    const deliveryQueue = pending.some((event) => event.id === fallbackEvent.id)
      ? pending
      : [...pending, fallbackEvent].slice(0, 10);

    for (const event of deliveryQueue) {
      try {
        await this.sink.append(event);
      } catch {
        // Preserve ordering and try again after the next purposeful learner action.
        break;
      }

      try {
        const deliveredAt = this.now().toISOString();
        writeStoredEvents(
          this.localStorage,
          readStoredEvents(this.localStorage).events.map((storedEvent) =>
            storedEvent.id === event.id ? { ...storedEvent, deliveredAt } : storedEvent,
          ),
        );
      } catch {
        // The server-side event ID makes a later retry idempotent.
      }
    }
  }

  async track(unvalidatedInput: ProductFunnelEventInput): Promise<void> {
    const input = assertProductFunnelEventInput(unvalidatedInput);
    const occurredAt = this.now().toISOString();
    const stored = readStoredEvents(this.localStorage);
    const duplicate = [...stored.events].reverse().find((event) =>
      event.eventType === input.eventType &&
      event.examId === input.examId &&
      event.contextCode === input.contextCode &&
      Math.abs(Date.parse(occurredAt) - Date.parse(event.occurredAt)) < 3_000,
    );
    if (duplicate !== undefined) return;

    const event: StoredFunnelEvent = {
      schemaVersion: 1,
      id: `fun_${this.randomId()}`,
      journeyId: this.journeyId(),
      occurredAt,
      ...input,
    };
    const next = [...stored.events, event].slice(-100);
    try {
      writeStoredEvents(this.localStorage, next);
    } catch {
      // Remote delivery is still attempted; conversion tracking never blocks learning.
    }
    await this.deliverPending(event);
  }
}
