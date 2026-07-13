import {
  mkdir,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export function resolveRawRoot(input: {
  cliRawDir?: string;
  envRawDir?: string;
  cwd: string;
}): string {
  const selected = input.cliRawDir ?? input.envRawDir ?? "Tmua";
  return resolve(input.cwd, selected);
}

async function walkPdfPaths(directory: string, root: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths: string[] = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`TMUA raw corpus may not contain symlinks: ${entry.name}`);
    }

    const relativePath = relative(root, absolutePath);
    const firstSegment = relativePath.split(sep)[0];
    if (firstSegment === "official-sources") continue;

    if (entry.isDirectory()) {
      paths.push(...(await walkPdfPaths(absolutePath, root)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      paths.push(absolutePath);
    }
  }

  return paths;
}

export async function discoverImportedPdfPaths(
  rawRoot: string,
): Promise<string[]> {
  const resolvedRoot = resolve(rawRoot);
  const paths = await walkPdfPaths(resolvedRoot, resolvedRoot);
  return paths.sort((left, right) => left.localeCompare(right, "en"));
}

export function toPortableRawPath(
  rawRoot: string,
  absolutePath: string,
): string {
  const resolvedRoot = resolve(rawRoot);
  const resolvedPath = resolve(absolutePath);
  const relativePath = relative(resolvedRoot, resolvedPath);

  if (
    relativePath.length === 0 ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`Path is outside the TMUA raw root: ${absolutePath}`);
  }

  return `Tmua/${relativePath.split(sep).join("/")}`;
}

export async function atomicWriteText(
  targetPath: string,
  value: string,
): Promise<void> {
  await mkdir(dirname(targetPath), { recursive: true });
  const temporaryPath = `${targetPath}.tmp`;
  try {
    await writeFile(temporaryPath, value, "utf8");
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}
