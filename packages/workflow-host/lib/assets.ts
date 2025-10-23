// Embedded asset layer. Every text asset lives as a standalone file in the
// repository and is referenced through `with { type: "file" }` imports: in dev
// mode the import resolves to the real file path; in a `bun build --compile`
// binary the file is embedded (bunfs, /$bunfs/root/...) and Bun.file reads it
// from the executable. Callers use the same API in both modes.
import schemaCorrectionPath from '../assets/prompts/schema-correction.txt' with { type: 'file' };
import schemaInstructionPath from '../assets/prompts/schema-instruction.txt' with { type: 'file' };
import skillPath from '../../../skill/SKILL.md' with { type: 'file' };
import generationKernelPath from '../../../skill/dynamic-workflow/00-cheatsheet.md' with { type: 'file' };
import configExamplePath from '../../../skill/kwf.config.example.json' with { type: 'file' };
import exampleAdversarialVerify from '../../../examples/adversarial-verify.kon' with { type: 'file' };
import exampleDeepResearch from '../../../examples/deep-research.kon' with { type: 'file' };
import exampleFanOutReduce from '../../../examples/fan-out-reduce.kon' with { type: 'file' };
import exampleLoopUntilDry from '../../../examples/loop-until-dry.kon' with { type: 'file' };
import exampleRouting from '../../../examples/routing.kon' with { type: 'file' };
import exampleGenFilter from '../../../examples/generate-and-filter.kon' with { type: 'file' };
import exampleTournament from '../../../examples/tournament.kon' with { type: 'file' };
import exampleLocalDigest from '../../../examples/local-digest.kon' with { type: 'file' };

// Language-manual chapters under skill/reference/ and skill/dynamic-workflow/.
// Each is embedded with `with { type: "file" }` (no dynamic readdir) so the
// same relative-path API serves dev mode and the compiled binary identically.
import refOverview from '../../../skill/reference/01-overview-mental-model.md' with { type: 'file' };
import refLexical from '../../../skill/reference/02-lexical-tokens.md' with { type: 'file' };
import refKonFormat from '../../../skill/reference/03-kon-data-format.md' with { type: 'file' };
import refStrings from '../../../skill/reference/04-strings.md' with { type: 'file' };
import refEvaluation from '../../../skill/reference/05-evaluation-model.md' with { type: 'file' };
import refBuiltins from '../../../skill/reference/06-builtins-control-flow.md' with { type: 'file' };
import refFunctions from '../../../skill/reference/07-functions-objects.md' with { type: 'file' };
import refStdlib from '../../../skill/reference/08-host-stdlib.md' with { type: 'file' };
import refTypeSystem from '../../../skill/reference/09-type-system.md' with { type: 'file' };
import refEffects from '../../../skill/reference/10-effects-and-typed-execution.md' with { type: 'file' };
import refReadme from '../../../skill/reference/README.md' with { type: 'file' };
import dwCheatsheet from '../../../skill/dynamic-workflow/00-cheatsheet.md' with { type: 'file' };
import dwOverview from '../../../skill/dynamic-workflow/01-overview.md' with { type: 'file' };
import dwDslReference from '../../../skill/dynamic-workflow/02-dsl-reference.md' with { type: 'file' };
import dwPatterns from '../../../skill/dynamic-workflow/03-authoring-patterns.md' with { type: 'file' };
import dwRunning from '../../../skill/dynamic-workflow/04-running-kwf.md' with { type: 'file' };
import dwReadme from '../../../skill/dynamic-workflow/README.md' with { type: 'file' };

// Layered scaffold/infer prompt assets (Chinese). Assembled at runtime by
// prompt-assembly.ts into the `kwf agent` design/infer system prompts.
import promptUniversal from '../assets/prompts/universal.md' with { type: 'file' };
import promptKwf from '../assets/prompts/kwf.md' with { type: 'file' };
import promptScaffold from '../assets/prompts/scaffold.md' with { type: 'file' };
import promptInfer from '../assets/prompts/infer.md' with { type: 'file' };

// Business-scenario skills, fetched on demand by the design agent via
// `kwf skill show <name>` (progressive disclosure).
import scenarioResearch from '../../../skill/scenarios/research/SKILL.md' with { type: 'file' };
import scenarioFanOut from '../../../skill/scenarios/fan-out-reduce/SKILL.md' with { type: 'file' };
import scenarioRouting from '../../../skill/scenarios/routing/SKILL.md' with { type: 'file' };
import scenarioAdversarial from '../../../skill/scenarios/adversarial-verify/SKILL.md' with { type: 'file' };
import scenarioLoop from '../../../skill/scenarios/loop-until-dry/SKILL.md' with { type: 'file' };
import scenarioGenFilter from '../../../skill/scenarios/generate-and-filter/SKILL.md' with { type: 'file' };
import scenarioTournament from '../../../skill/scenarios/tournament/SKILL.md' with { type: 'file' };
import scenarioLocalDigest from '../../../skill/scenarios/local-digest/SKILL.md' with { type: 'file' };
import scenarioGeneric from '../../../skill/scenarios/generic/SKILL.md' with { type: 'file' };

export type PromptAssetName = 'schema-correction' | 'schema-instruction';

const PROMPT_PATHS: { [name in PromptAssetName]: string } = {
  'schema-correction': schemaCorrectionPath,
  'schema-instruction': schemaInstructionPath,
};

const EXAMPLE_PATHS: { [name: string]: string } = {
  'adversarial-verify': exampleAdversarialVerify,
  'deep-research': exampleDeepResearch,
  'fan-out-reduce': exampleFanOutReduce,
  'generate-and-filter': exampleGenFilter,
  'local-digest': exampleLocalDigest,
  'loop-until-dry': exampleLoopUntilDry,
  'routing': exampleRouting,
  'tournament': exampleTournament,
};

// Relative path ("reference/03-kon-data-format.md") -> embedded file path. The
// relative key mirrors the on-disk layout so callers address chapters the same
// way the repository does.
const DOC_PATHS: { [relPath: string]: string } = {
  'reference/01-overview-mental-model.md': refOverview,
  'reference/02-lexical-tokens.md': refLexical,
  'reference/03-kon-data-format.md': refKonFormat,
  'reference/04-strings.md': refStrings,
  'reference/05-evaluation-model.md': refEvaluation,
  'reference/06-builtins-control-flow.md': refBuiltins,
  'reference/07-functions-objects.md': refFunctions,
  'reference/08-host-stdlib.md': refStdlib,
  'reference/09-type-system.md': refTypeSystem,
  'reference/10-effects-and-typed-execution.md': refEffects,
  'reference/README.md': refReadme,
  'dynamic-workflow/00-cheatsheet.md': dwCheatsheet,
  'dynamic-workflow/01-overview.md': dwOverview,
  'dynamic-workflow/02-dsl-reference.md': dwDslReference,
  'dynamic-workflow/03-authoring-patterns.md': dwPatterns,
  'dynamic-workflow/04-running-kwf.md': dwRunning,
  'dynamic-workflow/README.md': dwReadme,
};

const cache = new Map<string, Promise<string>>();

function readAsset(filePath: string): Promise<string> {
  let pending = cache.get(filePath);
  if (pending == null) {
    pending = Bun.file(filePath).text();
    cache.set(filePath, pending);
  }
  return pending;
}

export function listExampleNames(): string[] {
  return Object.keys(EXAMPLE_PATHS).sort();
}

export function readExampleAsset(name: string): Promise<string> {
  const filePath = EXAMPLE_PATHS[name];
  if (filePath == null) {
    return Promise.reject(new Error(
      `Unknown example: ${name} (available: ${listExampleNames().join(', ')})`));
  }
  return readAsset(filePath);
}

export function readSkillAsset(): Promise<string> {
  return readAsset(skillPath);
}

// Relative chapter paths of the embedded language manual, e.g.
// "reference/03-kon-data-format.md", sorted for a stable listing.
export function listDocNames(): string[] {
  return Object.keys(DOC_PATHS).sort();
}

export function readDocAsset(relPath: string): Promise<string> {
  const filePath = DOC_PATHS[relPath];
  if (filePath == null) {
    return Promise.reject(new Error(
      `Unknown doc: ${relPath} (available: ${listDocNames().join(', ')})`));
  }
  return readAsset(filePath);
}

// The generation kernel is the compact, trap-aware DSL cheat-sheet injected
// into the `kwf agent` scaffold as the system prompt. SKILL.md is a navigation
// entry and no longer carries DSL grammar, so the scaffold sources its
// authoritative syntax + traps from here instead.
export function readGenerationKernelAsset(): Promise<string> {
  return readAsset(generationKernelPath);
}

export function readConfigExampleAsset(): Promise<string> {
  // resolveJsonModule types this import as the parsed object, but at runtime
  // the file attribute makes bun hand back a path string in both modes.
  return readAsset(configExamplePath as unknown as string);
}

export function loadPromptAsset(name: PromptAssetName): Promise<string> {
  return readAsset(PROMPT_PATHS[name]);
}

// Layered prompt assets keyed by layer name (universal / kwf / scaffold / infer).
const PROMPT_LAYER_PATHS: { [name: string]: string } = {
  universal: promptUniversal,
  kwf: promptKwf,
  scaffold: promptScaffold,
  infer: promptInfer,
};

export function readPromptLayer(name: string): Promise<string> {
  const filePath = PROMPT_LAYER_PATHS[name];
  if (filePath == null) {
    return Promise.reject(new Error(`Unknown prompt layer: ${name}`));
  }
  return readAsset(filePath);
}

// Business-scenario skills. Insertion order is meaningful (research first) and
// preserved for the scenario index, so this map is NOT sorted.
const SCENARIO_PATHS: { [name: string]: string } = {
  'research': scenarioResearch,
  'fan-out-reduce': scenarioFanOut,
  'routing': scenarioRouting,
  'adversarial-verify': scenarioAdversarial,
  'loop-until-dry': scenarioLoop,
  'generate-and-filter': scenarioGenFilter,
  'tournament': scenarioTournament,
  'local-digest': scenarioLocalDigest,
  'generic': scenarioGeneric,
};

export function listScenarioNames(): string[] {
  return Object.keys(SCENARIO_PATHS);
}

export function readScenarioAsset(name: string): Promise<string> {
  const filePath = SCENARIO_PATHS[name];
  if (filePath == null) {
    return Promise.reject(new Error(
      `Unknown scenario: ${name} (available: ${listScenarioNames().join(', ')})`));
  }
  return readAsset(filePath);
}
