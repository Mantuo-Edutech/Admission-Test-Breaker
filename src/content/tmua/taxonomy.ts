import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import type {
  QuestionRecord,
  TaxonomyNode,
  ValidationIssue,
} from "./types.js";

export interface LoadedTaxonomy {
  knowledge: TaxonomyNode[];
  skills: TaxonomyNode[];
  errorTypes: TaxonomyNode[];
  all: TaxonomyNode[];
}

async function loadNodes(path: string): Promise<TaxonomyNode[]> {
  const parsed: unknown = parse(await readFile(path, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`Taxonomy file must contain an array: ${path}`);
  }
  return parsed as TaxonomyNode[];
}

export async function loadTaxonomyDirectory(
  directory: string,
): Promise<LoadedTaxonomy> {
  const [knowledge, skills, errorTypes] = await Promise.all([
    loadNodes(join(directory, "knowledge-tree.yaml")),
    loadNodes(join(directory, "skill-tags.yaml")),
    loadNodes(join(directory, "error-types.yaml")),
  ]);
  return {
    knowledge,
    skills,
    errorTypes,
    all: [...knowledge, ...skills, ...errorTypes],
  };
}

function issue(
  code: string,
  message: string,
  path?: string,
): ValidationIssue {
  return { severity: "P0", code, message, ...(path ? { path } : {}) };
}

export function validateTaxonomy(nodes: TaxonomyNode[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byId = new Map<string, TaxonomyNode>();

  for (const [index, node] of nodes.entries()) {
    const path = `taxonomy[${index}]`;
    if (byId.has(node.id)) {
      issues.push(issue("duplicate_taxonomy_id", `Duplicate taxonomy ID: ${node.id}`, path));
    } else {
      byId.set(node.id, node);
    }
    if (typeof node.name !== "string" || node.name.trim().length === 0) {
      issues.push(issue("invalid_taxonomy_name", `Taxonomy ${node.id} has an empty name`, path));
    }
    if (!["CORE", "SUPPORT", "EXTENSION"].includes(node.level)) {
      issues.push(issue("invalid_taxonomy_level", `Taxonomy ${node.id} has an invalid level`, path));
    }
  }

  for (const node of nodes) {
    if (node.parentId !== null && !byId.has(node.parentId)) {
      issues.push(
        issue(
          "missing_taxonomy_parent",
          `Taxonomy ${node.id} references missing parent ${node.parentId}`,
          node.id,
        ),
      );
    }
    for (const prerequisite of node.prerequisites ?? []) {
      if (prerequisite === node.id) {
        issues.push(
          issue(
            "taxonomy_self_reference",
            `Taxonomy ${node.id} references itself`,
            node.id,
          ),
        );
      } else if (!byId.has(prerequisite)) {
        issues.push(
          issue(
            "missing_taxonomy_prerequisite",
            `Taxonomy ${node.id} references missing prerequisite ${prerequisite}`,
            node.id,
          ),
        );
      }
    }
  }

  const state = new Map<string, "visiting" | "visited">();
  let cycleReported = false;
  function visit(id: string): void {
    if (state.get(id) === "visited") return;
    if (state.get(id) === "visiting") {
      if (!cycleReported) {
        issues.push(issue("taxonomy_cycle", `Taxonomy graph contains a cycle at ${id}`, id));
        cycleReported = true;
      }
      return;
    }
    state.set(id, "visiting");
    const node = byId.get(id);
    if (node !== undefined) {
      const references = [
        ...(node.parentId === null ? [] : [node.parentId]),
        ...(node.prerequisites ?? []),
      ];
      for (const reference of references) {
        if (reference !== id && byId.has(reference)) visit(reference);
      }
    }
    state.set(id, "visited");
  }
  for (const id of byId.keys()) visit(id);

  return issues;
}

export function validateQuestionTaxonomy(
  questions: QuestionRecord[],
  taxonomy: TaxonomyNode[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const knownIds = new Set(taxonomy.map((node) => node.id));

  for (const question of questions) {
    const reviewed =
      question.reviewStatus === "verified" ||
      question.contentStage === "published";
    if (reviewed && question.knowledgeTags.length === 0) {
      issues.push(
        issue(
          "missing_question_knowledge_tag",
          `${question.id} has no reviewed knowledge tag`,
          question.id,
        ),
      );
    }
    if (reviewed && question.skillTags.length === 0) {
      issues.push(
        issue(
          "missing_question_skill_tag",
          `${question.id} has no reviewed skill tag`,
          question.id,
        ),
      );
    }
    for (const tag of [
      ...question.knowledgeTags,
      ...question.skillTags,
      ...question.errorTypes,
    ]) {
      if (!knownIds.has(tag)) {
        issues.push(
          issue(
            "unknown_question_taxonomy_tag",
            `${question.id} references unknown taxonomy tag ${tag}`,
            question.id,
          ),
        );
      }
    }
  }

  return issues;
}
