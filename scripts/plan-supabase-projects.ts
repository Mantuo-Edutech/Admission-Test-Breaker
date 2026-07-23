import { execFile as execFileCallback } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import {
  buildSupabaseProjectSelectionPlan,
  type SupabaseProjectInventoryItem,
  type SupabaseProjectSelectionInput,
} from "../src/platform/supabase-project-selection.js";

const execFile = promisify(execFileCallback);

interface SupabaseCliProject {
  readonly id?: unknown;
  readonly ref?: unknown;
  readonly name?: unknown;
  readonly organization_id?: unknown;
  readonly status?: unknown;
  readonly created_at?: unknown;
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseInventory(value: unknown): readonly SupabaseProjectInventoryItem[] {
  if (!Array.isArray(value)) throw new Error("Supabase projects list 未返回数组。");
  return value.map((raw, index) => {
    const item = raw as SupabaseCliProject;
    const ref = typeof item.ref === "string"
      ? item.ref
      : typeof item.id === "string" ? item.id : "";
    if (
      !/^[a-z0-9]{20}$/u.test(ref)
      || typeof item.name !== "string"
      || item.name.trim() === ""
      || typeof item.organization_id !== "string"
      || typeof item.status !== "string"
    ) {
      throw new Error(`Supabase project ${index} 缺少安全清单字段。`);
    }
    return {
      ref,
      name: item.name,
      organizationId: item.organization_id,
      status: item.status,
      createdAt: typeof item.created_at === "string" ? item.created_at : undefined,
    };
  });
}

async function discoverProjects(): Promise<readonly SupabaseProjectInventoryItem[]> {
  try {
    const result = await execFile(
      "supabase",
      ["projects", "list", "--output", "json", "--agent", "no"],
      { encoding: "utf8", timeout: 30_000 },
    );
    return parseInventory(JSON.parse(result.stdout) as unknown);
  } catch {
    throw new Error(
      "无法读取 Supabase 项目清单。请先运行 `supabase login`；未执行任何云端写入。",
    );
  }
}

const inventory = await discoverProjects();
const configPath = argument("--config");
const json = process.argv.includes("--json");

if (configPath === undefined) {
  const summary = inventory.map((project) => ({
    ref: project.ref,
    name: project.name,
    organizationId: project.organizationId,
    status: project.status,
    createdAt: project.createdAt,
  }));
  if (json) console.log(JSON.stringify({ mode: "inventory", projects: summary }, null, 2));
  else {
    console.log(`Supabase project inventory: ${summary.length} project(s)`);
    for (const project of summary) {
      console.log(`- ${project.name} · ${project.ref} · ${project.status} · org ${project.organizationId}`);
    }
    console.log("Read-only inventory complete; no project was created, resumed, linked or modified.");
  }
  process.exit(0);
}

const input = JSON.parse(await readFile(configPath, "utf8")) as SupabaseProjectSelectionInput;
const plan = buildSupabaseProjectSelectionPlan(inventory, input);
if (json) console.log(JSON.stringify({ mode: "dry-run", ...plan }, null, 2));
else {
  console.log(`Supabase project selection plan: ${plan.valid ? "valid" : "invalid"}`);
  console.log(`Complete: ${plan.complete ? "yes" : "no"}`);
  console.log(`Ready for provisioning: ${plan.readyForProvisioning ? "yes" : "no"}`);
  for (const issue of plan.issues) console.log(`- [INVALID] ${issue}`);
  for (const step of plan.steps) console.log(`- [PLAN] ${step.description}`);
  for (const warning of plan.warnings) console.log(`- [WARNING] ${warning}`);
  console.log("Dry-run only; this command has no Supabase mutation path and reads no database password.");
}

if (!plan.valid) process.exitCode = 1;
