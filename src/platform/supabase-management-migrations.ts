export interface RepositoryMigration {
  readonly version: string;
  readonly name: string;
  readonly filePath: string;
  readonly sql: string;
}

export interface ManagementMigrationPlan {
  readonly appliedVersions: readonly string[];
  readonly pending: readonly RepositoryMigration[];
}

const migrationFilename = /^(\d{14})_([a-z0-9]+(?:_[a-z0-9]+)*)\.sql$/u;
const transactionControl = /^\s*(?:begin|commit|rollback)(?:\s+transaction)?\s*;/imu;

export function repositoryMigrationFromFile(
  filePath: string,
  sql: string,
): RepositoryMigration | null {
  const filename = filePath.split(/[\\/]/u).at(-1) ?? "";
  const match = filename.match(migrationFilename);
  if (match?.[1] === undefined || match[2] === undefined) return null;
  return { version: match[1], name: match[2], filePath, sql };
}

export function planManagementMigrations(
  localMigrations: readonly RepositoryMigration[],
  appliedVersions: readonly string[],
): ManagementMigrationPlan {
  const localByVersion = new Map<string, RepositoryMigration>();
  for (const migration of localMigrations) {
    if (localByVersion.has(migration.version)) {
      throw new Error(`Duplicate repository migration version: ${migration.version}`);
    }
    localByVersion.set(migration.version, migration);
  }
  const applied = [...new Set(appliedVersions)].sort();
  const unknownRemote = applied.filter((version) => !localByVersion.has(version));
  if (unknownRemote.length > 0) {
    throw new Error(`Remote migration history is not present in the repository: ${unknownRemote.join(", ")}`);
  }
  const appliedSet = new Set(applied);
  return {
    appliedVersions: applied,
    pending: [...localMigrations]
      .sort((left, right) => left.version.localeCompare(right.version))
      .filter((migration) => !appliedSet.has(migration.version)),
  };
}

export function transactionalManagementMigration(migration: RepositoryMigration): string {
  if (transactionControl.test(migration.sql)) {
    throw new Error(
      `Migration ${migration.version} contains transaction control and cannot use the Management API publisher`,
    );
  }
  const sourceMarker = `Applied atomically from repository migration ${migration.version}_${migration.name}.sql via Supabase Management API`;
  return [
    "begin;",
    migration.sql.trim(),
    "",
    "insert into supabase_migrations.schema_migrations (version, name, statements)",
    `values ('${migration.version}', '${migration.name}', array['${sourceMarker}']);`,
    "commit;",
    "",
  ].join("\n");
}
