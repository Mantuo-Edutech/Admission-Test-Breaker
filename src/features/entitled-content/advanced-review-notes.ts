export const ESAT_ADVANCED_NOTES_RESOURCE_ID = "esat-advanced-notes-v1";
export const TARA_ADVANCED_NOTES_RESOURCE_ID = "tara-advanced-notes-v1";

export type AdvancedNotesResourceId =
  | typeof ESAT_ADVANCED_NOTES_RESOURCE_ID
  | typeof TARA_ADVANCED_NOTES_RESOURCE_ID;

export interface AdvancedNotesPlaybook {
  readonly titleEn: string;
  readonly titleZh: string;
  readonly triggerEn: string;
  readonly triggerZh: string;
  readonly actionEn: string;
  readonly actionZh: string;
  readonly checkEn: string;
  readonly checkZh: string;
}

export interface AdvancedNotesWorkedCase {
  readonly titleEn: string;
  readonly titleZh: string;
  readonly promptEn: string;
  readonly promptZh: string;
  readonly steps: readonly {
    readonly labelEn: string;
    readonly labelZh: string;
    readonly bodyEn: string;
    readonly bodyZh: string;
  }[];
  readonly answerEn: string;
  readonly answerZh: string;
  readonly trapEn: string;
  readonly trapZh: string;
}

export interface AdvancedNotesModule {
  readonly id: string;
  readonly number: string;
  readonly titleEn: string;
  readonly titleZh: string;
  readonly purposeEn: string;
  readonly purposeZh: string;
  readonly knowledgeFocusEn: readonly string[];
  readonly knowledgeFocusZh: readonly string[];
  readonly playbooks: readonly AdvancedNotesPlaybook[];
  readonly workedCase: AdvancedNotesWorkedCase;
  readonly trainingPrescriptionEn: readonly string[];
  readonly trainingPrescriptionZh: readonly string[];
}

export interface AdvancedReviewNotes {
  readonly schemaVersion: 1;
  readonly id: AdvancedNotesResourceId;
  readonly examId: "esat" | "tara";
  readonly edition: string;
  readonly publicationStatus: "published";
  readonly titleEn: string;
  readonly titleZh: string;
  readonly subtitleEn: string;
  readonly subtitleZh: string;
  readonly authorshipEn: string;
  readonly authorshipZh: string;
  readonly audienceEn: string;
  readonly audienceZh: string;
  readonly rightsNoticeEn: string;
  readonly rightsNoticeZh: string;
  readonly modules: readonly AdvancedNotesModule[];
  readonly reviewProtocol: readonly {
    readonly stepEn: string;
    readonly stepZh: string;
    readonly actionEn: string;
    readonly actionZh: string;
  }[];
  readonly sourceAnchors: readonly {
    readonly title: string;
    readonly localPath: string;
    readonly sha256: string;
    readonly usedForEn: string;
    readonly usedForZh: string;
  }[];
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function strings(value: unknown, label: string, minimum = 1): readonly string[] {
  if (!Array.isArray(value) || value.length < minimum) {
    throw new Error(`${label} must contain at least ${minimum} items`);
  }
  return value.map((item, index) => text(item, `${label}.${index}`));
}

function objects<T>(
  value: unknown,
  label: string,
  parse: (item: Record<string, unknown>, index: number) => T,
  minimum = 1,
): readonly T[] {
  if (!Array.isArray(value) || value.length < minimum) {
    throw new Error(`${label} must contain at least ${minimum} items`);
  }
  return value.map((item, index) => parse(record(item, `${label}.${index}`), index));
}

export function parseAdvancedReviewNotes(value: unknown): AdvancedReviewNotes {
  const root = record(value, "advanced review notes");
  const expectedExam = root.id === ESAT_ADVANCED_NOTES_RESOURCE_ID
    ? "esat"
    : root.id === TARA_ADVANCED_NOTES_RESOURCE_ID
      ? "tara"
      : null;
  if (
    root.schemaVersion !== 1 ||
    expectedExam === null ||
    root.examId !== expectedExam ||
    root.publicationStatus !== "published"
  ) {
    throw new Error("Advanced review notes header is invalid");
  }

  const modules = objects(root.modules, "modules", (module, moduleIndex) => {
    const focusEn = strings(module.knowledgeFocusEn, `modules.${moduleIndex}.knowledgeFocusEn`, 3);
    const focusZh = strings(module.knowledgeFocusZh, `modules.${moduleIndex}.knowledgeFocusZh`, 3);
    const prescriptionEn = strings(
      module.trainingPrescriptionEn,
      `modules.${moduleIndex}.trainingPrescriptionEn`,
      3,
    );
    const prescriptionZh = strings(
      module.trainingPrescriptionZh,
      `modules.${moduleIndex}.trainingPrescriptionZh`,
      3,
    );
    if (focusEn.length !== focusZh.length || prescriptionEn.length !== prescriptionZh.length) {
      throw new Error(`modules.${moduleIndex} bilingual lists must align`);
    }
    const workedCase = record(module.workedCase, `modules.${moduleIndex}.workedCase`);
    return {
      id: text(module.id, `modules.${moduleIndex}.id`),
      number: text(module.number, `modules.${moduleIndex}.number`),
      titleEn: text(module.titleEn, `modules.${moduleIndex}.titleEn`),
      titleZh: text(module.titleZh, `modules.${moduleIndex}.titleZh`),
      purposeEn: text(module.purposeEn, `modules.${moduleIndex}.purposeEn`),
      purposeZh: text(module.purposeZh, `modules.${moduleIndex}.purposeZh`),
      knowledgeFocusEn: focusEn,
      knowledgeFocusZh: focusZh,
      playbooks: objects(module.playbooks, `modules.${moduleIndex}.playbooks`, (playbook, playbookIndex) => ({
        titleEn: text(playbook.titleEn, `modules.${moduleIndex}.playbooks.${playbookIndex}.titleEn`),
        titleZh: text(playbook.titleZh, `modules.${moduleIndex}.playbooks.${playbookIndex}.titleZh`),
        triggerEn: text(playbook.triggerEn, `modules.${moduleIndex}.playbooks.${playbookIndex}.triggerEn`),
        triggerZh: text(playbook.triggerZh, `modules.${moduleIndex}.playbooks.${playbookIndex}.triggerZh`),
        actionEn: text(playbook.actionEn, `modules.${moduleIndex}.playbooks.${playbookIndex}.actionEn`),
        actionZh: text(playbook.actionZh, `modules.${moduleIndex}.playbooks.${playbookIndex}.actionZh`),
        checkEn: text(playbook.checkEn, `modules.${moduleIndex}.playbooks.${playbookIndex}.checkEn`),
        checkZh: text(playbook.checkZh, `modules.${moduleIndex}.playbooks.${playbookIndex}.checkZh`),
      }), 2),
      workedCase: {
        titleEn: text(workedCase.titleEn, `modules.${moduleIndex}.workedCase.titleEn`),
        titleZh: text(workedCase.titleZh, `modules.${moduleIndex}.workedCase.titleZh`),
        promptEn: text(workedCase.promptEn, `modules.${moduleIndex}.workedCase.promptEn`),
        promptZh: text(workedCase.promptZh, `modules.${moduleIndex}.workedCase.promptZh`),
        steps: objects(workedCase.steps, `modules.${moduleIndex}.workedCase.steps`, (step, stepIndex) => ({
          labelEn: text(step.labelEn, `modules.${moduleIndex}.workedCase.steps.${stepIndex}.labelEn`),
          labelZh: text(step.labelZh, `modules.${moduleIndex}.workedCase.steps.${stepIndex}.labelZh`),
          bodyEn: text(step.bodyEn, `modules.${moduleIndex}.workedCase.steps.${stepIndex}.bodyEn`),
          bodyZh: text(step.bodyZh, `modules.${moduleIndex}.workedCase.steps.${stepIndex}.bodyZh`),
        }), 3),
        answerEn: text(workedCase.answerEn, `modules.${moduleIndex}.workedCase.answerEn`),
        answerZh: text(workedCase.answerZh, `modules.${moduleIndex}.workedCase.answerZh`),
        trapEn: text(workedCase.trapEn, `modules.${moduleIndex}.workedCase.trapEn`),
        trapZh: text(workedCase.trapZh, `modules.${moduleIndex}.workedCase.trapZh`),
      },
      trainingPrescriptionEn: prescriptionEn,
      trainingPrescriptionZh: prescriptionZh,
    };
  }, expectedExam === "esat" ? 5 : 4);

  if (new Set(modules.map((module) => module.id)).size !== modules.length) {
    throw new Error("Advanced review note module IDs must be unique");
  }

  const sourceAnchors = objects(root.sourceAnchors, "sourceAnchors", (anchor, index) => {
    const localPath = text(anchor.localPath, `sourceAnchors.${index}.localPath`);
    const digest = text(anchor.sha256, `sourceAnchors.${index}.sha256`);
    if (!localPath.startsWith("content/official/raw/") || !/^[a-f0-9]{64}$/u.test(digest)) {
      throw new Error(`sourceAnchors.${index} is invalid`);
    }
    return {
      title: text(anchor.title, `sourceAnchors.${index}.title`),
      localPath,
      sha256: digest,
      usedForEn: text(anchor.usedForEn, `sourceAnchors.${index}.usedForEn`),
      usedForZh: text(anchor.usedForZh, `sourceAnchors.${index}.usedForZh`),
    };
  }, 2);

  return {
    schemaVersion: 1,
    id: root.id as AdvancedNotesResourceId,
    examId: expectedExam,
    edition: text(root.edition, "edition"),
    publicationStatus: "published",
    titleEn: text(root.titleEn, "titleEn"),
    titleZh: text(root.titleZh, "titleZh"),
    subtitleEn: text(root.subtitleEn, "subtitleEn"),
    subtitleZh: text(root.subtitleZh, "subtitleZh"),
    authorshipEn: text(root.authorshipEn, "authorshipEn"),
    authorshipZh: text(root.authorshipZh, "authorshipZh"),
    audienceEn: text(root.audienceEn, "audienceEn"),
    audienceZh: text(root.audienceZh, "audienceZh"),
    rightsNoticeEn: text(root.rightsNoticeEn, "rightsNoticeEn"),
    rightsNoticeZh: text(root.rightsNoticeZh, "rightsNoticeZh"),
    modules,
    reviewProtocol: objects(root.reviewProtocol, "reviewProtocol", (step, index) => ({
      stepEn: text(step.stepEn, `reviewProtocol.${index}.stepEn`),
      stepZh: text(step.stepZh, `reviewProtocol.${index}.stepZh`),
      actionEn: text(step.actionEn, `reviewProtocol.${index}.actionEn`),
      actionZh: text(step.actionZh, `reviewProtocol.${index}.actionZh`),
    }), 4),
    sourceAnchors,
  };
}
