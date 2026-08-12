import assert from 'assert';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';

const packageRoot = resolve(import.meta.dir, '../..');
const workspaceRoot = resolve(packageRoot, '../..');
const descriptorFiles = [
  resolve(packageRoot, 'lib/OrmEntityAnnotations.ts'),
  resolve(packageRoot, 'dist/OrmEntityAnnotations.d.ts'),
];
const aggregateImports = [
  'kunun-type-annotations',
  'kunun',
];

describe('ORM datasource public type authority', function () {
  it('keeps datasource identity out of source and generated descriptors', function () {
    for (const file of descriptorFiles) {
      const descriptor = interfaceBody(
        readFileSync(file, 'utf8'),
        'OrmDataSourceAnnotationDescriptor',
      );

      assert.doesNotMatch(descriptor, /^\s*(Key|Name)\??:/m, `${file} exposes datasource identity`);
    }
  });

  it('keeps datasource identity out of aggregate public type imports', function () {
    for (const packageName of aggregateImports) {
      const source = `
        import type { OrmDataSourceAnnotationDescriptor } from '${packageName}';
        type IdentityResidue = Extract<keyof OrmDataSourceAnnotationDescriptor, 'Key' | 'Name'>;
        const noIdentityResidue: IdentityResidue extends never ? true : false = true;
      `;
      const result = typecheckPublicImport(packageName, source);

      assert.deepEqual(result, [], `${packageName} exposes datasource identity:\n${result.join('\n')}`);
    }
  });
});

function interfaceBody(source: string, interfaceName: string): string {
  const declaration = `export interface ${interfaceName}`;
  const declarationStart = source.indexOf(declaration);
  assert.notEqual(declarationStart, -1, `missing ${interfaceName}`);

  const bodyStart = source.indexOf('{', declarationStart);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index++) {
    if (source[index] === '{') {
      depth++;
    } else if (source[index] === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(bodyStart + 1, index);
      }
    }
  }

  assert.fail(`unterminated ${interfaceName}`);
}

function typecheckPublicImport(packageName: string, source: string): string[] {
  const fixturePath = resolve(workspaceRoot, `.typecheck-${packageName}.ts`);
  const options: ts.CompilerOptions = {
    baseUrl: workspaceRoot,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    noEmit: true,
    paths: {
      kunun: ['packages/kunun/dist/index.d.ts'],
      'kunun-type-annotations': ['packages/type-annotations/dist/index.d.ts'],
    },
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ESNext,
  };
  const host = ts.createCompilerHost(options);
  const originalGetSourceFile = host.getSourceFile;
  const originalReadFile = host.readFile;
  const originalFileExists = host.fileExists;

  host.fileExists = file => file === fixturePath || originalFileExists(file);
  host.readFile = file => file === fixturePath ? source : originalReadFile(file);
  host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (file === fixturePath) {
      return ts.createSourceFile(file, source, languageVersion, true);
    }
    return originalGetSourceFile(file, languageVersion, onError, shouldCreateNewSourceFile);
  };

  const program = ts.createProgram([fixturePath], options, host);
  return ts.getPreEmitDiagnostics(program).map(diagnostic =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
}
