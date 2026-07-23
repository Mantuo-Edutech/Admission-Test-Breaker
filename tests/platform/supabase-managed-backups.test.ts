import { describe, expect, it } from "vitest";
import {
  assessSupabaseManagedBackups,
  MANAGED_BACKUP_MAX_AGE_HOURS,
} from "../../src/platform/supabase-managed-backups.js";

const NOW = new Date("2026-07-24T12:00:00.000Z");

function dailyBackup(insertedAt: string): unknown {
  return {
    region: "ap-southeast-1",
    walg_enabled: true,
    pitr_enabled: false,
    backups: [
      {
        id: 42,
        is_physical_backup: true,
        status: "COMPLETED",
        inserted_at: insertedAt,
      },
    ],
    physical_backup_data: {},
  };
}

describe("Supabase managed backup evidence", () => {
  it("accepts a recent completed daily backup", () => {
    const assessment = assessSupabaseManagedBackups(
      dailyBackup("2026-07-23T09:00:00.000Z"),
      NOW,
    );

    expect(assessment).toMatchObject({
      ready: true,
      strategy: "daily-backup",
      region: "ap-southeast-1",
      walgEnabled: true,
      pitrEnabled: false,
      completedBackupCount: 1,
      latestRestorePoint: "2026-07-23T09:00:00.000Z",
      latestRestorePointAgeHours: 27,
      issues: [],
    });
  });

  it("rejects a completed daily backup older than the production tolerance", () => {
    const assessment = assessSupabaseManagedBackups(
      dailyBackup("2026-07-23T05:59:59.000Z"),
      NOW,
    );

    expect(assessment.ready).toBe(false);
    expect(assessment.latestRestorePointAgeHours).toBeGreaterThan(
      MANAGED_BACKUP_MAX_AGE_HOURS,
    );
    expect(assessment.issues).toContain(
      "最新恢复点超过 30 小时，不能满足生产恢复点时效门槛。",
    );
  });

  it("does not accept WAL-G alone without an actual restore point", () => {
    const assessment = assessSupabaseManagedBackups({
      region: "ap-southeast-1",
      walg_enabled: true,
      pitr_enabled: false,
      backups: [],
      physical_backup_data: {},
    }, NOW);

    expect(assessment).toMatchObject({
      ready: false,
      strategy: "none",
      completedBackupCount: 0,
      latestRestorePoint: null,
    });
    expect(assessment.issues).toContain(
      "尚无可验证的已完成每日备份或 PITR 恢复点。",
    );
  });

  it("accepts a valid recent PITR recovery window without requiring daily backups", () => {
    const assessment = assessSupabaseManagedBackups({
      region: "ap-southeast-1",
      walg_enabled: true,
      pitr_enabled: true,
      backups: [],
      physical_backup_data: {
        earliest_physical_backup_date_unix: Date.parse("2026-07-18T12:00:00.000Z") / 1_000,
        latest_physical_backup_date_unix: Date.parse("2026-07-24T10:00:00.000Z") / 1_000,
      },
    }, NOW);

    expect(assessment).toMatchObject({
      ready: true,
      strategy: "point-in-time-recovery",
      pitrEnabled: true,
      completedBackupCount: 0,
      latestRestorePoint: "2026-07-24T10:00:00.000Z",
      latestRestorePointAgeHours: 2,
      issues: [],
    });
  });

  it("rejects incomplete, inverted or stale PITR evidence", () => {
    const incomplete = assessSupabaseManagedBackups({
      region: "ap-southeast-1",
      walg_enabled: true,
      pitr_enabled: true,
      backups: [],
      physical_backup_data: {},
    }, NOW);
    const inverted = assessSupabaseManagedBackups({
      region: "ap-southeast-1",
      walg_enabled: true,
      pitr_enabled: true,
      backups: [],
      physical_backup_data: {
        earliest_physical_backup_date_unix: Date.parse("2026-07-24T10:00:00.000Z") / 1_000,
        latest_physical_backup_date_unix: Date.parse("2026-07-24T09:00:00.000Z") / 1_000,
      },
    }, NOW);
    const stale = assessSupabaseManagedBackups({
      region: "ap-southeast-1",
      walg_enabled: true,
      pitr_enabled: true,
      backups: [],
      physical_backup_data: {
        earliest_physical_backup_date_unix: Date.parse("2026-07-01T00:00:00.000Z") / 1_000,
        latest_physical_backup_date_unix: Date.parse("2026-07-22T00:00:00.000Z") / 1_000,
      },
    }, NOW);

    expect(incomplete.ready).toBe(false);
    expect(inverted.ready).toBe(false);
    expect(stale.ready).toBe(false);
    expect(incomplete.issues).toContain("PITR 已启用，但最早或最新恢复点无效。");
    expect(inverted.issues).toContain("PITR 最早恢复点晚于最新恢复点。");
    expect(stale.issues).toContain("最新恢复点超过 30 小时，不能满足生产恢复点时效门槛。");
  });

  it("rejects future timestamps and malformed API shapes", () => {
    const future = assessSupabaseManagedBackups(
      dailyBackup("2026-07-24T12:05:01.000Z"),
      NOW,
    );
    const malformed = assessSupabaseManagedBackups(null, NOW);

    expect(future.ready).toBe(false);
    expect(future.issues).toContain(
      "最新恢复点晚于当前时间，无法作为可信备份证据。",
    );
    expect(malformed.ready).toBe(false);
    expect(malformed.issues).toContain("Supabase 备份 API 响应必须是对象。");
  });
});
