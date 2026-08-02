import { cpSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dir, "..");
const stagingRoot = join(workspaceRoot, ".types");
const packageDirectories = [
  "core",
  "converter",
  "runtime",
  "type-system",
  "type-annotations",
  "kunun",
] as const;

rmSync(stagingRoot, { force: true, recursive: true });

const result = Bun.spawnSync(
  ["bun", "x", "tsc", "-p", "tsconfig.types.json"],
  {
    cwd: workspaceRoot,
    stderr: "inherit",
    stdout: "inherit",
  },
);

if (result.exitCode !== 0) {
  process.exit(result.exitCode);
}

for (const directory of packageDirectories) {
  const destination = join(workspaceRoot, "packages", directory, "dist");
  rmSync(destination, { force: true, recursive: true });
  cpSync(join(stagingRoot, directory, "lib"), destination, {
    recursive: true,
  });
}

rmSync(stagingRoot, { force: true, recursive: true });
