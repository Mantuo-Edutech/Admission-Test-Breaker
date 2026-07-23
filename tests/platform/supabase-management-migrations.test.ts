import { describe, expect, it } from "vitest";
import {
  planManagementMigrations,
  repositoryMigrationFromFile,
  transactionalManagementMigration,
} from "../../src/platform/supabase-management-migrations.js";

describe("Supabase Management API migration publishing", () => {
  const first = repositoryMigrationFromFile(
    "supabase/migrations/20260723000000_first_change.sql",
    "create table public.first_change (id bigint primary key);",
  )!;
  const second = repositoryMigrationFromFile(
    "supabase/migrations/20260723000001_second_change.sql",
    "create table public.second_change (id bigint primary key);",
  )!;

  it("plans only repository migrations absent from remote history", () => {
    expect(planManagementMigrations([second, first], [first.version]).pending).toEqual([second]);
  });

  it("fails closed when the remote history has no repository source", () => {
    expect(() => planManagementMigrations([first], ["20260722999999"]))
      .toThrow("Remote migration history is not present in the repository");
  });

  it("wraps schema and history changes in the same transaction", () => {
    const sql = transactionalManagementMigration(first);
    expect(sql).toMatch(/^begin;/u);
    expect(sql).toContain(first.sql);
    expect(sql).toContain("insert into supabase_migrations.schema_migrations");
    expect(sql).toMatch(/commit;\n$/u);
  });

  it("rejects nested transaction control", () => {
    expect(() => transactionalManagementMigration({ ...first, sql: "begin; select 1; commit;" }))
      .toThrow("contains transaction control");
  });
});
