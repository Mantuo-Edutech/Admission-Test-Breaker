import {
  asLearnerSpaceId,
  asUserId,
  assertCanonicalUtcTimestamp,
  type LearnerSpaceId,
  type UserId,
} from "../shared/ids.js";

export type ActorRef =
  | { kind: "student" | "teacher" | "parent"; userId: UserId }
  | { kind: "agent" | "system"; actorId: string };

export interface LearnerSpace {
  id: LearnerSpaceId;
  ownerUserId: UserId;
  status: "active" | "archived";
  createdAt: string;
}

export interface CreateLearnerSpaceInput {
  id: string;
  ownerUserId: string;
  createdAt: string;
  status?: LearnerSpace["status"];
}

export function createLearnerSpace(
  input: CreateLearnerSpaceInput,
): LearnerSpace {
  if (input.status !== undefined && input.status !== "active") {
    throw new Error("A new learner space must start active");
  }

  assertCanonicalUtcTimestamp(input.createdAt, "Learner space createdAt");

  return {
    id: asLearnerSpaceId(input.id),
    ownerUserId: asUserId(input.ownerUserId),
    status: "active",
    createdAt: input.createdAt,
  };
}

export function isLearnerSpaceOwner(
  learnerSpace: LearnerSpace,
  userId: string,
): boolean {
  return learnerSpace.ownerUserId === userId;
}
