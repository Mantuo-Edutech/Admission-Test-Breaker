import { readFile, writeFile } from "node:fs/promises";
import {
  buildSupabaseCiLayout,
  rewriteSupabaseConfigForCi,
} from "./lib/supabase-ci-config.js";

if (process.env.GITHUB_ACTIONS !== "true") {
  throw new Error("Refusing to rewrite Supabase ports outside GitHub Actions.");
}

const runId = process.env.GITHUB_RUN_ID;
const runAttempt = process.env.GITHUB_RUN_ATTEMPT;
if (!runId || !runAttempt) {
  throw new Error("GITHUB_RUN_ID and GITHUB_RUN_ATTEMPT are required.");
}

const configPath = "supabase/config.toml";
const layout = buildSupabaseCiLayout(runId, runAttempt);
const source = await readFile(configPath, "utf8");
await writeFile(configPath, rewriteSupabaseConfigForCi(source, layout), "utf8");

console.log(
  `Prepared isolated Supabase CI project ${layout.projectId} on ports ${Object.values(layout.ports).join(", ")}.`,
);
