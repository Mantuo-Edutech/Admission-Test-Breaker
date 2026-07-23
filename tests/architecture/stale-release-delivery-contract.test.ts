import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function projectSource(filePath: string): string {
  return readFileSync(resolve(process.cwd(), filePath), "utf8");
}

describe("stale SPA release delivery contract", () => {
  it("installs recovery before React starts routing", () => {
    const main = projectSource("src/app/main.tsx");
    const installIndex = main.indexOf("installStaleReleaseRecovery()");
    const renderIndex = main.indexOf("createRoot(");

    expect(installIndex).toBeGreaterThan(-1);
    expect(renderIndex).toBeGreaterThan(installIndex);
  });

  it("retains hashed assets from the running container and release images", () => {
    const archiveScript = projectSource("deploy/prepare-static-asset-archive.sh");

    expect(archiveScript).toContain("docker cp \"$container_name:/usr/share/nginx/html/assets/.\"");
    expect(archiveScript).toContain("docker image ls --format");
    expect(archiveScript).toContain("docker cp \"$seed_container:/usr/share/nginx/html/assets/.\"");
    expect(archiveScript).toContain("ASSET_RETENTION_DAYS");
  });

  it("serves immutable hashed assets without falling back to the app shell", () => {
    const nginx = projectSource("deploy/nginx.conf");

    expect(nginx).toMatch(/location \/assets\/ \{[\s\S]*try_files \$uri =404;/);
    expect(nginx).toContain('Cache-Control "public, max-age=31536000, immutable"');
  });
});
