import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

async function source(path: string): Promise<string> {
  return readFile(path, "utf8");
}

describe("shared ECS host-Nginx release control", () => {
  it("keeps both operational scripts syntactically valid and executable", async () => {
    const scripts = [
      "deploy/deploy-ecs-host-nginx.sh",
      "deploy/rollback-ecs-host-nginx.sh",
    ];

    for (const script of scripts) {
      await expect(execFileAsync("bash", ["-n", script])).resolves.toBeDefined();
      expect((await stat(script)).mode & 0o111).toBeGreaterThan(0);
    }
  });

  it("verifies a loopback candidate before touching the live container", async () => {
    const deployment = await source("deploy/deploy-ecs-host-nginx.sh");
    const candidateStart = deployment.indexOf("starting an isolated candidate");
    const candidateVerification = deployment.indexOf("candidate verification passed");
    const currentStop = deployment.indexOf('docker stop --time 20 "$current_container"');
    const publicVerification = deployment.indexOf(
      'verify_http_contract "$PUBLIC_APP_ORIGIN"',
    );
    const stateCommit = deployment.indexOf(
      'mv "$state_staging" "$STATE_DIRECTORY/current.json"',
    );

    expect(candidateStart).toBeGreaterThan(-1);
    expect(candidateVerification).toBeGreaterThan(candidateStart);
    expect(currentStop).toBeGreaterThan(candidateVerification);
    expect(publicVerification).toBeGreaterThan(currentStop);
    expect(stateCommit).toBeGreaterThan(publicVerification);
    expect(deployment).toContain("127.0.0.1::8080");
    expect(deployment).toContain("127.0.0.1:${HOST_PORT}:8080");
    expect(deployment).toContain("the shared ECS release controller never binds ports 80 or 443");
  });

  it("binds an exact image, runtime identity and stale-tab asset archive", async () => {
    const [deployment, assets, example, dockerfile, workflow] = await Promise.all([
      source("deploy/deploy-ecs-host-nginx.sh"),
      source("deploy/prepare-static-asset-archive.sh"),
      source("deploy/ecs-host-nginx.env.example"),
      source("Dockerfile"),
      source(".github/workflows/release-image.yml"),
    ]);

    expect(deployment).toContain(
      "APP_RELEASE must be a full lowercase 40-character Git commit SHA",
    );
    expect(deployment).toContain(
      "APP_IMAGE must use APP_RELEASE as its immutable tag",
    );
    expect(deployment).toContain(
      "EXPECTED_IMAGE_DIGEST must be the release workflow manifest digest",
    );
    expect(deployment).toContain("docker image inspect --format '{{.Id}}'");
    expect(deployment).toContain("pulled image manifest digest does not match EXPECTED_IMAGE_DIGEST");
    expect(deployment.indexOf('docker pull "$APP_IMAGE"')).toBeLessThan(
      deployment.indexOf("pulled image manifest digest does not match EXPECTED_IMAGE_DIGEST"),
    );
    expect(deployment).toContain("release image revision label does not match APP_RELEASE");
    expect(deployment).toContain("/opt/mantuo/build-revision");
    expect(deployment).toContain("generating browser runtime files from the exact release image");
    expect(deployment).toContain("/docker-entrypoint.d/40-runtime-config.sh");
    expect(deployment).toContain('EXPECTED_SUPABASE_PROJECT_REF');
    expect(deployment).toContain('prepare-static-asset-archive.sh');
    expect(assets).toContain("ASSET_RETENTION_DAYS");
    expect(example).not.toMatch(
      /^(?:SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|SMTP_PASS|TURNSTILE_SECRET_KEY)=/mu,
    );
    expect(dockerfile).toContain('LABEL org.opencontainers.image.revision="$BUILD_REVISION"');
    expect(dockerfile).toContain("/opt/mantuo/build-revision");
    expect(workflow).toContain("BUILD_REVISION=${{ github.sha }}");
    expect(workflow).toContain("steps.build.outputs.digest");
    expect(deployment).not.toContain("docker system prune");
  });

  it("retains the previous container and restores it when cutover fails", async () => {
    const [deployment, rollback] = await Promise.all([
      source("deploy/deploy-ecs-host-nginx.sh"),
      source("deploy/rollback-ecs-host-nginx.sh"),
    ]);
    const retainPrevious = deployment.indexOf(
      'docker rename "$current_container" "$rollback_container"',
    );
    const markCutover = deployment.indexOf("cutover_started=1", retainPrevious);

    expect(retainPrevious).toBeGreaterThan(-1);
    expect(markCutover).toBeGreaterThan(retainPrevious);
    expect(deployment).toContain("rollback_failed_cutover");
    expect(deployment).toContain(
      'docker rename "$rollback_container" "$previous_original_name"',
    );
    expect(deployment).toContain("immediate rollback container retained");
    expect(rollback).toContain('previousRelease');
    expect(rollback).toContain('previousContainer');
    expect(rollback).toContain('wait_for_release "$public_origin" "$previous_release"');
    expect(rollback).toContain("rollback failed; restoring $current_release");
  });

  it("treats host Nginx as a read-only shared boundary", async () => {
    const [deployment, rollback] = await Promise.all([
      source("deploy/deploy-ecs-host-nginx.sh"),
      source("deploy/rollback-ecs-host-nginx.sh"),
    ]);

    for (const script of [deployment, rollback]) {
      expect(script).toContain("nginx -t");
      expect(script).toContain('grep -Eq "proxy_pass[[:space:]]+http://127');
      expect(script).toContain("127.0.0.1:$HOST_PORT");
      expect(script).not.toMatch(/systemctl\s+(?:restart|reload)\s+nginx/u);
      expect(script).not.toMatch(/(?:cp|mv|sed\s+-i)[^\n]*\/etc\/nginx/u);
    }
  });
});
