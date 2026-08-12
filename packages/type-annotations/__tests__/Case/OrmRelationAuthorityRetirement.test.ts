import assert from 'assert';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { resolve } from 'path';

const packageRoot = resolve(import.meta.dir, '../..');
const workspaceRoot = resolve(packageRoot, '../..');
const packagesRoot = resolve(workspaceRoot, 'packages');
const guardPath = resolve(import.meta.path);
const retiredModules = [
  resolve(packageRoot, 'lib/OrmRelationAnnotations.ts'),
  resolve(packageRoot, 'dist/OrmRelationAnnotations.d.ts'),
];
const publicArtifacts = [
  resolve(packageRoot, 'lib/index.ts'),
  resolve(packageRoot, 'dist/index.d.ts'),
  resolve(workspaceRoot, 'packages/kunun/lib/index.ts'),
  resolve(workspaceRoot, 'packages/kunun/dist/index.d.ts'),
  resolve(workspaceRoot, 'packages/kunun/dist/index.mjs'),
  resolve(workspaceRoot, 'packages/kunun/dist/index.cjs'),
];
const retiredMarkers = [
  'OrmRelationAnnotationProfile',
  'ValidateDepaOrmRelation',
  'ORM relation annotation must use',
];
const scannedExtensions = ['.ts', '.d.ts', '.mjs', '.cjs'];

describe('detached ORM relation annotation retirement', function () {
  it('removes the retired source and declaration modules', function () {
    for (const file of retiredModules) {
      assert.equal(existsSync(file), false, `${file} must not exist`);
    }
  });

  it('keeps retired symbols out of public source and generated artifacts', function () {
    for (const file of publicArtifacts) {
      assert.equal(existsSync(file), true, `${file} must exist for retirement verification`);
    }

    for (const file of collectFiles(packagesRoot)) {
      const source = readFileSync(file, 'utf8');
      for (const marker of retiredMarkers) {
        assert.equal(source.includes(marker), false, `${file} contains retired marker ${marker}`);
      }
      assert.equal(
        /#\(\s*orm\s+#relation\b/.test(source),
        false,
        `${file} contains a detached ORM relation annotation`,
      );
    }
  });
});

function collectFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    if (entry === 'node_modules') {
      continue;
    }
    const path = resolve(directory, entry);
    if (path === guardPath) {
      continue;
    }
    if (statSync(path).isDirectory()) {
      files.push(...collectFiles(path));
      continue;
    }
    if (scannedExtensions.some(extension => path.endsWith(extension))) {
      files.push(path);
    }
  }
  return files;
}
