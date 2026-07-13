import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  atomicWriteText,
  discoverImportedPdfPaths,
  resolveRawRoot,
  toPortableRawPath,
} from "../../../src/content/tmua/fs-utils.js";

const temporaryRoots: string[] = [];

async function temporaryRoot() {
  const root = await mkdtemp(join(tmpdir(), "tmua-fs-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    temporaryRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

describe("TMUA raw-root resolution", () => {
  it("prefers CLI, then environment, then the cwd Tmua directory", () => {
    expect(
      resolveRawRoot({
        cliRawDir: "./cli-corpus",
        envRawDir: "./environment-corpus",
        cwd: "/workspace",
      }),
    ).toBe("/workspace/cli-corpus");

    expect(
      resolveRawRoot({
        envRawDir: "./environment-corpus",
        cwd: "/workspace",
      }),
    ).toBe("/workspace/environment-corpus");

    expect(resolveRawRoot({ cwd: "/workspace" })).toBe("/workspace/Tmua");
  });
});

describe("TMUA PDF discovery", () => {
  it("returns sorted PDFs while excluding official supplements", async () => {
    const root = await temporaryRoot();
    await mkdir(join(root, "nested"), { recursive: true });
    await mkdir(join(root, "official-sources"), { recursive: true });
    await writeFile(join(root, "z.pdf"), "z");
    await writeFile(join(root, "nested", "A.PDF"), "a");
    await writeFile(join(root, "nested", "notes.txt"), "ignore");
    await writeFile(join(root, "official-sources", "supplement.pdf"), "x");

    const discovered = await discoverImportedPdfPaths(root);

    expect(discovered).toEqual([
      join(root, "nested", "A.PDF"),
      join(root, "z.pdf"),
    ]);
  });

  it("rejects symlinks instead of following them", async () => {
    const root = await temporaryRoot();
    const target = join(root, "target.pdf");
    await writeFile(target, "target");
    await symlink(target, join(root, "linked.pdf"));

    await expect(discoverImportedPdfPaths(root)).rejects.toThrow(/symlink/i);
  });
});

describe("portable TMUA paths", () => {
  it("emits a POSIX Tmua-relative path", async () => {
    const root = await temporaryRoot();
    const path = join(root, "answer key", "tmua-2023.pdf");
    expect(toPortableRawPath(root, path)).toBe(
      "Tmua/answer key/tmua-2023.pdf",
    );
  });

  it("rejects paths outside the raw root", async () => {
    const root = await temporaryRoot();
    expect(() => toPortableRawPath(root, join(root, "..", "escape.pdf"))).toThrow(
      /outside/i,
    );
  });
});

describe("atomic writes", () => {
  it("creates parents and leaves only the completed target", async () => {
    const root = await temporaryRoot();
    const target = join(root, "generated", "manifest.json");

    await atomicWriteText(target, "{\"ok\":true}\n");

    expect(await readFile(target, "utf8")).toBe("{\"ok\":true}\n");
    await expect(readFile(`${target}.tmp`, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
