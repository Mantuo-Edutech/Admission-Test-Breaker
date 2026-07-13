import {
  asGuestSpaceId,
  assertCanonicalUtcTimestamp,
  type GuestSpaceId,
  type UserId,
} from "../shared/ids.js";

export type ActorRef =
  | { kind: "guest"; actorId: string }
  | { kind: "student" | "teacher" | "parent"; userId: UserId }
  | { kind: "agent" | "system"; actorId: string };

export interface GuestSpace {
  id: GuestSpaceId;
  ownerActorId: string;
  status: "unclaimed";
  createdAt: string;
}

export function createGuestSpace(input: {
  id: string;
  ownerActorId: string;
  createdAt: string;
}): GuestSpace {
  if (
    !input.ownerActorId.startsWith("guest_") ||
    input.ownerActorId.length === 6
  ) {
    throw new Error("Guest actor ID must start with guest_ and contain a value");
  }
  assertCanonicalUtcTimestamp(input.createdAt, "Guest space createdAt");
  return {
    id: asGuestSpaceId(input.id),
    ownerActorId: input.ownerActorId,
    status: "unclaimed",
    createdAt: input.createdAt,
  };
}

export function isGuestSpaceOwner(
  space: GuestSpace,
  actor: ActorRef,
): boolean {
  return actor.kind === "guest" && actor.actorId === space.ownerActorId;
}
