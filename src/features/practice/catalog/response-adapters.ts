import type { PracticeResponseMode } from "./assessment-registry.js";

export type PracticeResponseInput = string | readonly string[];

export interface PracticeResponseAdapter {
  readonly mode: PracticeResponseMode;
  readonly renderer: "choice" | "multi-choice" | "essay";
  readonly immediatelyScored: boolean;
  serialise(input: PracticeResponseInput): string;
}

const optionLabel = /^[A-Z][A-Z0-9-]{0,15}$/u;

function serialiseSingleChoice(input: PracticeResponseInput): string {
  if (typeof input !== "string") {
    throw new Error("A single-choice response must contain exactly one option");
  }
  const value = input.trim().toUpperCase();
  if (!optionLabel.test(value)) {
    throw new Error("Choice response is invalid");
  }
  return value;
}

function serialiseMultiChoice(input: PracticeResponseInput): string {
  if (typeof input === "string") {
    return serialiseSingleChoice(input);
  }
  const values = [...new Set(input.map((value) => value.trim().toUpperCase()))].sort();
  if (values.length === 0 || values.length > 12 || !values.every((value) => optionLabel.test(value))) {
    throw new Error("Multiple-choice response is invalid");
  }
  return `multi:${values.join("|")}`;
}

function serialiseEssay(input: PracticeResponseInput): string {
  if (typeof input !== "string") {
    throw new Error("An essay response must be text");
  }
  const value = input.trim();
  if (value.length === 0 || value.length > 20_000) {
    throw new Error("Essay response must contain between 1 and 20,000 characters");
  }
  return value;
}

export const PRACTICE_RESPONSE_ADAPTERS: Readonly<Record<PracticeResponseMode, PracticeResponseAdapter>> = {
  "single-choice": {
    mode: "single-choice",
    renderer: "choice",
    immediatelyScored: true,
    serialise: serialiseSingleChoice,
  },
  "passage-choice": {
    mode: "passage-choice",
    renderer: "choice",
    immediatelyScored: true,
    serialise: serialiseSingleChoice,
  },
  essay: {
    mode: "essay",
    renderer: "essay",
    immediatelyScored: false,
    serialise: serialiseEssay,
  },
  "mixed-choice": {
    mode: "mixed-choice",
    renderer: "multi-choice",
    immediatelyScored: true,
    serialise: serialiseMultiChoice,
  },
  "data-choice": {
    mode: "data-choice",
    renderer: "choice",
    immediatelyScored: true,
    serialise: serialiseSingleChoice,
  },
  "partial-credit-choice": {
    mode: "partial-credit-choice",
    renderer: "multi-choice",
    immediatelyScored: true,
    serialise: serialiseMultiChoice,
  },
};

export function getPracticeResponseAdapter(mode: PracticeResponseMode): PracticeResponseAdapter {
  return PRACTICE_RESPONSE_ADAPTERS[mode];
}
