export interface SupabaseCiLayout {
  readonly projectId: string;
  readonly ports: Readonly<Record<string, number>>;
}

const PORT_BLOCK_START = 20_000;
const PORT_BLOCK_SIZE = 16;
const PORT_BLOCK_COUNT = 700;

const portOffsets = {
  "api.port": 0,
  "db.port": 1,
  "db.shadow_port": 2,
  "db.pooler.port": 3,
  "studio.port": 4,
  "local_smtp.port": 5,
  "edge_runtime.inspector_port": 6,
  "analytics.port": 7,
} as const;

function numericIdentifier(value: string, name: string): bigint {
  if (!/^\d+$/u.test(value)) {
    throw new Error(`${name} must contain digits only.`);
  }
  return BigInt(value);
}

export function buildSupabaseCiLayout(
  runId: string,
  runAttempt: string,
): SupabaseCiLayout {
  const numericRunId = numericIdentifier(runId, "GITHUB_RUN_ID");
  const numericAttempt = numericIdentifier(runAttempt, "GITHUB_RUN_ATTEMPT");
  if (numericAttempt < 1n) throw new Error("GITHUB_RUN_ATTEMPT must be at least 1.");

  // A rerun intentionally moves to another port block. This makes a failed or
  // partially cleaned runner unable to poison the next database verification.
  const slot = Number((numericRunId + numericAttempt * 73n) % BigInt(PORT_BLOCK_COUNT));
  const basePort = PORT_BLOCK_START + slot * PORT_BLOCK_SIZE;
  const suffix = runId.slice(-12);

  return {
    projectId: `atb-ci-${suffix}-${runAttempt}`,
    ports: Object.fromEntries(
      Object.entries(portOffsets).map(([key, offset]) => [key, basePort + offset]),
    ),
  };
}

export function rewriteSupabaseConfigForCi(
  source: string,
  layout: SupabaseCiLayout,
): string {
  let section = "";
  let projectIdWritten = false;
  const writtenPorts = new Set<string>();

  const rewritten = source.split("\n").map((line) => {
    const sectionMatch = /^\[([^\]]+)\]\s*$/u.exec(line);
    if (sectionMatch) {
      section = sectionMatch[1] ?? "";
      return line;
    }

    if (section === "" && /^project_id\s*=/u.test(line)) {
      projectIdWritten = true;
      return `project_id = "${layout.projectId}"`;
    }

    const settingMatch = /^(port|shadow_port|inspector_port)\s*=\s*\d+\s*$/u.exec(line);
    if (!settingMatch) return line;

    const key = `${section}.${settingMatch[1]}`;
    const replacement = layout.ports[key];
    if (replacement === undefined) return line;
    writtenPorts.add(key);
    return `${settingMatch[1]} = ${replacement}`;
  }).join("\n");

  if (!projectIdWritten) throw new Error("Supabase config has no top-level project_id.");
  const missingPorts = Object.keys(layout.ports).filter((key) => !writtenPorts.has(key));
  if (missingPorts.length > 0) {
    throw new Error(`Supabase config is missing CI-isolated ports: ${missingPorts.join(", ")}`);
  }

  return rewritten;
}
