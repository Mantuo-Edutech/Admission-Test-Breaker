import {
  createGuestSpace,
  type GuestSpace,
} from "../../../platform/learning-space/domain.js";
import type { GuestSpaceStore } from "./store.js";

export const GUEST_SPACE_STORAGE_KEY = "admission-breaker:guest-space:v1";
const corruptKeyPrefix = "admission-breaker:guest-space:corrupt:";

const guestSpaceFields = new Set([
  "id",
  "ownerActorId",
  "status",
  "createdAt",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseGuestSpace(value: unknown): GuestSpace {
  if (!isRecord(value)) {
    throw new Error("Guest space must be an object");
  }
  for (const key of Object.keys(value)) {
    if (!guestSpaceFields.has(key)) {
      throw new Error(`Guest space contains unsupported field ${key}`);
    }
  }
  for (const key of guestSpaceFields) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new Error(`Guest space is missing field ${key}`);
    }
  }
  if (
    typeof value.id !== "string" ||
    typeof value.ownerActorId !== "string" ||
    typeof value.createdAt !== "string"
  ) {
    throw new Error("Guest space fields have invalid types");
  }
  if (value.status !== "unclaimed") {
    throw new Error("Guest space status is unsupported");
  }

  return createGuestSpace({
    id: value.id,
    ownerActorId: value.ownerActorId,
    createdAt: value.createdAt,
  });
}

export class LocalGuestSpaceStore implements GuestSpaceStore {
  private memorySpace: GuestSpace | null = null;

  constructor(
    private readonly storage: Storage,
    private readonly now: () => Date = () => new Date(),
    private readonly createSuffix: () => string,
  ) {}

  async loadOrCreate(): Promise<GuestSpace> {
    if (this.memorySpace !== null) {
      return this.memorySpace;
    }

    let raw: string | null = null;
    try {
      raw = this.storage.getItem(GUEST_SPACE_STORAGE_KEY);
    } catch {
      return this.createAndRemember();
    }

    if (raw !== null) {
      try {
        const parsed = parseGuestSpace(JSON.parse(raw) as unknown);
        this.memorySpace = parsed;
        return parsed;
      } catch {
        this.quarantine(raw);
      }
    }

    const created = this.createAndRemember();
    this.persist(created);
    return created;
  }

  private createAndRemember(): GuestSpace {
    const suffix = this.createSuffix();
    const space = createGuestSpace({
      id: `gsp_${suffix}`,
      ownerActorId: `guest_${suffix}`,
      createdAt: this.now().toISOString(),
    });
    this.memorySpace = space;
    return space;
  }

  private persist(space: GuestSpace): void {
    try {
      this.storage.setItem(GUEST_SPACE_STORAGE_KEY, JSON.stringify(space));
    } catch {
      // The in-memory identity remains stable for this page lifetime.
    }
  }

  private quarantine(raw: string): void {
    const timestamp = this.now().toISOString().replace(/[:.]/g, "-");
    try {
      this.storage.setItem(`${corruptKeyPrefix}${timestamp}`, raw);
    } catch {
      // Continue with a fresh in-memory identity if quarantine is unavailable.
    }
    try {
      this.storage.removeItem(GUEST_SPACE_STORAGE_KEY);
    } catch {
      // The malformed value is never trusted even when removal is unavailable.
    }
  }
}
