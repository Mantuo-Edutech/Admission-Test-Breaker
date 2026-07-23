import { describe, expect, it } from "vitest";
import {
  getPracticePaper,
  loadPracticePaper,
} from "../../../../src/features/practice/content/practice-paper-registry.js";
import { UCAT_QUANTITATIVE_REASONING_FULL_MOCK } from "../../../../src/features/practice/content/ucat-quantitative-reasoning-full-mock.js";
import { validatePracticePaper } from "../../../../src/features/practice/content/validate.js";

const EXPECTED_TAGS = [
  "ucat-qr-percentage-decrease",
  "ucat-qr-time-conversion",
  "ucat-qr-percentage-increase",
  "ucat-qr-inventory-balance",
  "ucat-qr-percentage-of-total",
  "ucat-qr-multi-step-cost",
  "ucat-qr-speed",
  "ucat-qr-rate-per-time",
  "ucat-qr-weighted-percentage",
  "ucat-qr-percentage-points",
] as const;

function optionText(questionNumber: number): string {
  const question = UCAT_QUANTITATIVE_REASONING_FULL_MOCK.questions[questionNumber - 1]!;
  const option = question.options.find((candidate) => candidate.label === question.correctAnswer)!;
  const block = option.content[0]!;
  if (block.kind !== "paragraph" || block.runs[0]?.kind !== "text") {
    throw new Error(`Question ${questionNumber} answer is not plain text`);
  }
  return block.runs[0].value;
}

function money(value: number): string {
  return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function maximumLabel(labels: readonly string[], values: readonly number[]): string {
  return labels[values.indexOf(Math.max(...values))]!;
}

function minimumLabel(labels: readonly string[], values: readonly number[]): string {
  return labels[values.indexOf(Math.min(...values))]!;
}

describe("UCAT Quantitative Reasoning original full mock", () => {
  it("loads a complete 36-question, 26-minute paper with the basic calculator", () => {
    expect(UCAT_QUANTITATIVE_REASONING_FULL_MOCK).toMatchObject({
      id: "ucat-quantitative-reasoning-full-mock-v1",
      exam: "UCAT",
      sectionId: "quantitative-reasoning",
      durationMinutes: 26,
      calculator: "basic",
      deliveryMode: "structured",
      publicationStatus: "teaching-preview",
      authorship: "满托教研原创",
    });
    expect(UCAT_QUANTITATIVE_REASONING_FULL_MOCK.questions).toHaveLength(36);
    expect(validatePracticePaper(UCAT_QUANTITATIVE_REASONING_FULL_MOCK)).toEqual([]);
  });

  it("uses nine native rectangular datasets with four questions each", () => {
    const passages = UCAT_QUANTITATIVE_REASONING_FULL_MOCK.passages ?? [];
    const tables = passages.flatMap((passage) => passage.content.filter((block) => block.kind === "table"));
    expect(passages).toHaveLength(9);
    expect(tables).toHaveLength(9);
    expect(tables.every((table) =>
      table.rows.length > 0 && table.rows.every((row) => row.length === table.headers.length)
    )).toBe(true);

    for (const passage of passages) {
      expect(UCAT_QUANTITATIVE_REASONING_FULL_MOCK.questions.filter(
        (question) => question.passageId === passage.id,
      )).toHaveLength(4);
    }
    expect(UCAT_QUANTITATIVE_REASONING_FULL_MOCK.questions.every(
      (question) => question.options.length === 4,
    )).toBe(true);
  });

  it("pins the answer key and covers all ten published QR knowledge families", () => {
    expect(UCAT_QUANTITATIVE_REASONING_FULL_MOCK.questions
      .map((question) => question.correctAnswer).join(""))
      .toBe("BBCDBCACBCCBCCCDCCCCCCBCBCCCCCDCCCBB");
    expect(new Set(UCAT_QUANTITATIVE_REASONING_FULL_MOCK.questions.flatMap(
      (question) => question.knowledgeTags,
    ))).toEqual(new Set(EXPECTED_TAGS));
  });

  it("independently recalculates every keyed answer from the published datasets", () => {
    const attendances = [240 * 0.85, 300 * 0.92, 200 * 0.875, 220 * 0.9];
    const consultationMinutes = [
      attendances[0]! * 18 / 6,
      attendances[1]! * 15 / 8,
      attendances[2]! * 20 / 5,
      attendances[3]! * 16 / 4,
    ];
    const invoices = [
      600 * 1.8 * 0.9 + 30,
      180 * 7.5 * 0.92 + 40,
      250 * 4.2 * 0.88 + 25,
      320 * 3.6 * 0.95 + 35,
    ];
    const completed = [6840, 7980, 5890, 4864];
    const routeDistance = [75, 92, 68, 105];
    const outwardMinutes = [65, 80, 60, 90];
    const returnMinutes = [75, 85, 70, 95];
    const roundTripSpeeds = routeDistance.map((distance, index) =>
      (distance * 2) / ((outwardMinutes[index]! + returnMinutes[index]!) / 60)
    );
    const responseRates = [120 / 192, 153 / 225, 90 / 144, 119 / 196];
    const january = [42000, 51200, 36000, 28800];
    const march = [37800, 48640, 33300, 27360];
    const floorArea = [1200, 1600, 900, 720];
    const proteinPerPack = [18 * 8, 24 * 6, 15 * 10, 30 * 5];
    const sodium = [240, 310, 180, 400];
    const nonDefective = [18 * 120 * 0.9875, 16 * 150 * 0.98, 20 * 100 * 0.99, 15 * 180 * 0.98];
    const operatingMinutes = [18 * 35, 16 * 40, 20 * 30, 15 * 45];
    const participants = [1250, 1600, 980, 1170];
    const positive = [175, 208, 147, 152];
    const followUp = [140, 176, 126, 130];
    const programmeCost = [18750, 22400, 15680, 17550];

    const expectedAnswers = [
      String(attendances[0]),
      `${attendances[1]! * 15 / 60} hours`,
      attendances.reduce((total, value) => total + value, 0).toLocaleString("en-GB"),
      maximumLabel(["North", "Central", "South", "East"], consultationMinutes),
      money(invoices[0]!),
      money(invoices[1]! / 180),
      money(250 * 4.2 * 0.12),
      money(invoices.reduce((total, value) => total + value, 0)),
      `${(7200 / 9000) * 100}%`,
      `${(7980 / 8400) * 100}%`,
      `${(completed.reduce((total, value) => total + value, 0) / 45000 * 100).toFixed(1)}%`,
      String(6200 * 0.1 * 0.95),
      `${(92 / (80 / 60)).toFixed(1)} km/h`,
      money(75 * 2 * 0.18 + 6),
      money(68 * 2 * 0.2 + 4 + (130 / 60) * 14),
      maximumLabel(["Route A", "Route B", "Route C", "Route D"], roundTripSpeeds),
      `${((240 - 192) / 240) * 100}%`,
      `${(153 / 225) * 100}%`,
      `${((192 + 225 + 144 + 196) / 1000 * 100).toFixed(1)}%`,
      `${((responseRates[1]! - responseRates[3]!) * 100).toFixed(1)}`,
      `${((42000 - 37800) / 42000) * 100}%`,
      `${((51200 + 49920 + 48640) / 3).toLocaleString("en-GB")} kWh`,
      minimumLabel(
        ["Department A", "Department B", "Department C", "Department D"],
        march.map((value, index) => value / floorArea[index]!),
      ),
      `${((january.reduce((total, value) => total + value, 0) - march.reduce((total, value) => total + value, 0)) / january.reduce((total, value) => total + value, 0) * 100).toFixed(1)}%`,
      money(6.3 / proteinPerPack[1]! * 100),
      `${3 * sodium[1]!} mg`,
      `£${(420 / 10) * 7}`,
      maximumLabel(
        ["Product A", "Product B", "Product C", "Product D"],
        proteinPerPack.map((value, index) => value / sodium[index]!),
      ),
      nonDefective[0]!.toLocaleString("en-GB"),
      `${Math.floor(operatingMinutes[1]! / 60)} h ${operatingMinutes[1]! % 60} min`,
      maximumLabel(
        ["Line A", "Line B", "Line C", "Line D"],
        nonDefective.map((value, index) => value / operatingMinutes[index]!),
      ),
      String(20 * 0.15 * 100 * 0.99),
      maximumLabel(
        ["North", "Central", "South", "East"],
        positive.map((value, index) => value / participants[index]!),
      ),
      `${(followUp.reduce((total, value) => total + value, 0) / positive.reduce((total, value) => total + value, 0) * 100).toFixed(1)}%`,
      minimumLabel(
        ["North", "Central", "South", "East"],
        programmeCost.map((value, index) => value / participants[index]!),
      ),
      `${(((15680 / 980) - (22400 / 1600)) / (22400 / 1600) * 100).toFixed(1)}%`,
    ];

    expect(UCAT_QUANTITATIVE_REASONING_FULL_MOCK.questions.map((question) => optionText(question.number)))
      .toEqual(expectedAnswers);
  });

  it("keeps official anchors internal and loads the large paper only on demand", async () => {
    expect(UCAT_QUANTITATIVE_REASONING_FULL_MOCK.sourceAnchors.map((source) => source.sha256)).toEqual([
      "9aa4a93bddcc62bf53c6196f2b38ac40240a1f781154590c772c68f179d52dbf",
      "a659bedc40b1a603cb755e75121a19a633889d2aab62b66d62378e804f7b8c7c",
    ]);
    expect(JSON.stringify(UCAT_QUANTITATIVE_REASONING_FULL_MOCK)).not.toContain("source-pdf");
    expect(getPracticePaper(UCAT_QUANTITATIVE_REASONING_FULL_MOCK.id)).toBeNull();
    await expect(loadPracticePaper(UCAT_QUANTITATIVE_REASONING_FULL_MOCK.id))
      .resolves.toBe(UCAT_QUANTITATIVE_REASONING_FULL_MOCK);
    expect(getPracticePaper(UCAT_QUANTITATIVE_REASONING_FULL_MOCK.id))
      .toBe(UCAT_QUANTITATIVE_REASONING_FULL_MOCK);
  });
});
