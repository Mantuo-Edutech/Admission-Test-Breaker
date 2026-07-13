import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("package contract", () => {
  it("declares Node versions supported by the locked direct toolchain", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      engines?: { node?: string };
    };

    expect(packageJson.engines?.node).toBe("^22.13.0 || >=24.0.0");
  });
});
