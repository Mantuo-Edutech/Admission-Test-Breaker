import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";
import {
  planManagementMigrations,
  repositoryMigrationFromFile,
  transactionalManagementMigration,
  type RepositoryMigration,
} from "../src/platform/supabase-management-migrations.js";

const execFile = promisify(execFileCallback);
const apply = process.argv.includes("--apply");
const projectRef = process.env.SUPABASE_PROJECT_REF;

if (projectRef === undefined || !/^[a-z]{20}$/u.test(projectRef)) {
  throw new Error("SUPABASE_PROJECT_REF is required and must be a valid project ref");
}
if (process.env.SUPABASE_ACCESS_TOKEN === undefined) {
  throw new Error("SUPABASE_ACCESS_TOKEN is required");
}

async function supabase(args: readonly string[]): Promise<string> {
  try {
    const result = await execFile("pnpm", ["exec", "supabase", ...args], {
      encoding: "utf8",
      timeout: 180_000,
      maxBuffer: 16 * 1024 * 1024,
      env: process.env,
    });
    return result.stdout;
  } catch {
    throw new Error("Supabase Management API migration command failed; sensitive command output was suppressed");
  }
}

async function localMigrations(): Promise<readonly RepositoryMigration[]> {
  const directory = resolve("supabase/migrations");
  const names = (await readdir(directory)).sort();
  const migrations = await Promise.all(
    names.map(async (name) => {
      const filePath = resolve(directory, name);
      return repositoryMigrationFromFile(filePath, await readFile(filePath, "utf8"));
    }),
  );
  return migrations.filter((migration): migration is RepositoryMigration => migration !== null);
}

function queryRows<T>(value: string): readonly T[] {
  const parsed = JSON.parse(value) as { rows?: unknown };
  if (!Array.isArray(parsed.rows)) throw new Error("Supabase Management API returned an invalid query response");
  return parsed.rows as readonly T[];
}

async function appliedVersions(): Promise<readonly string[]> {
  const value = await supabase([
    "db",
    "query",
    "--linked",
    "select version from supabase_migrations.schema_migrations order by version",
    "--output",
    "json",
  ]);
  return queryRows<{ version?: unknown }>(value).map((row) => {
    if (typeof row.version !== "string") throw new Error("Remote migration version is invalid");
    return row.version;
  });
}

await supabase(["link", "--project-ref", projectRef]);
const migrations = await localMigrations();
const plan = planManagementMigrations(migrations, await appliedVersions());

console.log(
  `Supabase ${apply ? "apply" : "plan"}: ${plan.appliedVersions.length} applied, ${plan.pending.length} pending`,
);
for (const migration of plan.pending) {
  console.log(`- ${migration.version}_${migration.name}`);
}

if (!apply) process.exit(0);

for (const migration of plan.pending) {
  const directory = await mkdtemp(join(tmpdir(), "mantuo-supabase-migration-"));
  const wrapperPath = join(directory, basename(migration.filePath));
  try {
    await writeFile(wrapperPath, transactionalManagementMigration(migration), {
      encoding: "utf8",
      mode: 0o600,
    });
    await supabase(["db", "query", "--linked", "--file", wrapperPath, "--output", "json"]);
    console.log(`Applied ${migration.version}_${migration.name}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const verified = planManagementMigrations(migrations, await appliedVersions());
if (verified.pending.length > 0) {
  throw new Error(`Remote migration verification still has ${verified.pending.length} pending migrations`);
}
console.log(`Supabase migration verification: PASS (${verified.appliedVersions.length}/${migrations.length})`);
