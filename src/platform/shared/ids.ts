export type UserId = `usr_${string}`;
export type LearnerSpaceId = `lsp_${string}`;
export type GrantId = `grt_${string}`;
export type PracticeSessionId = `ses_${string}`;
export type LearningEventId = `evt_${string}`;
export type AIRunId = `air_${string}`;
export type ProjectionRef = `projection:${string}`;

function asPrefixedId<TPrefix extends string>(
  value: string,
  prefix: TPrefix,
  label: string,
): `${TPrefix}${string}` {
  if (!value.startsWith(prefix) || value.length === prefix.length) {
    throw new Error(`${label} must start with ${prefix} and contain a value`);
  }

  return value as `${TPrefix}${string}`;
}

export function asUserId(value: string): UserId {
  return asPrefixedId(value, "usr_", "User ID");
}

export function asLearnerSpaceId(value: string): LearnerSpaceId {
  return asPrefixedId(value, "lsp_", "Learner space ID");
}

export function asGrantId(value: string): GrantId {
  return asPrefixedId(value, "grt_", "Grant ID");
}

export function asPracticeSessionId(value: string): PracticeSessionId {
  return asPrefixedId(value, "ses_", "Practice session ID");
}

export function asLearningEventId(value: string): LearningEventId {
  return asPrefixedId(value, "evt_", "Learning event ID");
}

export function asAIRunId(value: string): AIRunId {
  return asPrefixedId(value, "air_", "AI run ID");
}

export function asProjectionRef(value: string): ProjectionRef {
  return asPrefixedId(value, "projection:", "Projection reference");
}

export function assertCanonicalUtcTimestamp(
  value: string,
  label = "Value",
): void {
  const canonicalUtcPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  const parsed = Date.parse(value);

  if (
    !canonicalUtcPattern.test(value) ||
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString() !== value
  ) {
    throw new Error(`${label} must be a canonical UTC timestamp`);
  }
}
