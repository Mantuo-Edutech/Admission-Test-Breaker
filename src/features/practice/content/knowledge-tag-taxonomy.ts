import rawTaxonomy from "../../../../content/exams/knowledge-tag-taxonomy.json" with { type: "json" };

export interface KnowledgeTagLabel {
  readonly id: string;
  readonly zh: string;
  readonly en: string;
}

interface KnowledgeTagTaxonomy {
  readonly schemaVersion: 1;
  readonly revision: string;
  readonly entries: readonly KnowledgeTagLabel[];
}

function parseKnowledgeTagTaxonomy(value: unknown): KnowledgeTagTaxonomy {
  if (typeof value !== "object" || value === null) throw new Error("Knowledge-tag taxonomy must be an object");
  const candidate = value as Partial<KnowledgeTagTaxonomy>;
  if (candidate.schemaVersion !== 1) throw new Error("Unsupported knowledge-tag taxonomy schema");
  if (typeof candidate.revision !== "string" || candidate.revision.trim() === "") {
    throw new Error("Knowledge-tag taxonomy requires a revision");
  }
  if (!Array.isArray(candidate.entries) || candidate.entries.length === 0) {
    throw new Error("Knowledge-tag taxonomy requires entries");
  }
  const ids = new Set<string>();
  const entries = candidate.entries.map((entry) => {
    if (typeof entry !== "object" || entry === null) throw new Error("Knowledge-tag entry must be an object");
    const item = entry as Partial<KnowledgeTagLabel>;
    if (
      typeof item.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(item.id) ||
      typeof item.zh !== "string" || item.zh.trim() === "" ||
      typeof item.en !== "string" || item.en.trim() === ""
    ) {
      throw new Error("Knowledge-tag entries require a machine id and bilingual labels");
    }
    if (ids.has(item.id)) throw new Error(`Duplicate knowledge tag: ${item.id}`);
    ids.add(item.id);
    return { id: item.id, zh: item.zh.trim(), en: item.en.trim() };
  });
  return { schemaVersion: 1, revision: candidate.revision, entries };
}

const taxonomy = parseKnowledgeTagTaxonomy(rawTaxonomy);
const labelById = new Map(taxonomy.entries.map((entry) => [entry.id, entry]));

export const KNOWLEDGE_TAG_TAXONOMY_REVISION = taxonomy.revision;
export const KNOWLEDGE_TAGS = taxonomy.entries;

export function knowledgeTagLabel(id: string): string {
  const entry = labelById.get(id);
  if (entry === undefined) return "待归类知识主题 · Topic pending classification";
  return `${entry.zh} · ${entry.en}`;
}

export function hasKnowledgeTagLabel(id: string): boolean {
  return labelById.has(id);
}
