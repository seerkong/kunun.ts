// Engineered prompt assembly for the `kwf agent` scaffold/infer steps.
//
// Instead of one hard-coded 8KB system prompt, the design/infer system prompts
// are composed at runtime from layered Markdown assets (all Chinese):
//   universal  — task-agnostic agent discipline (reusable by any agent)
//   kwf        — kwf/kunun/Kon-specific facts (syntax floor, kwf commands)
//   scaffold   — the "turn a requirement into a runnable workflow" step
//   infer      — the "infer the workflow's :input args" step
// plus the Kon cheatsheet (syntax authority) and a scenario index. The concrete
// business-scenario patterns live as on-demand skills (skill/scenarios/<name>/)
// that the design agent fetches itself via `kwf skill show <name>`.
//
// `{{KWF}}` is a placeholder for however the design agent must invoke kwf in its
// runtime (default `kwf`; e.g. `bun /w/.../kwf.ts` inside a Finch test box). It
// is substituted at the moment text crosses to the agent — both here (assembled
// system prompt) and in `kwf skill show` output.

import {
  listScenarioNames,
  readGenerationKernelAsset,
  readPromptLayer,
  readScenarioAsset,
} from './assets';

const KWF_PLACEHOLDER = /\{\{KWF\}\}/g;
const SECTION_SEP = '\n\n---\n\n';

// How the design agent invokes kwf at run time. Overridable via env so a Finch
// test box can point at `bun /w/packages/workflow-host/bin/kwf.ts`.
export function resolveKwfInvocation(): string {
  const fromEnv = process.env.KWF_INVOCATION;
  return fromEnv != null && fromEnv.trim() !== '' ? fromEnv.trim() : 'kwf';
}

export function substituteKwf(text: string, kwfInvocation = resolveKwfInvocation()): string {
  return text.replace(KWF_PLACEHOLDER, kwfInvocation);
}

// Pull a single `field: value` line out of a Markdown YAML-ish frontmatter block.
function frontmatterField(md: string, field: string): string {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return '';
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0 && line.slice(0, idx).trim() === field) {
      return line.slice(idx + 1).trim();
    }
  }
  return '';
}

// One-line-per-scenario index (name + frontmatter description), telling the
// design agent to fetch the full pattern of whichever scenario fits.
async function buildScenarioIndex(): Promise<string> {
  const lines = await Promise.all(listScenarioNames().map(async (name) => {
    const desc = frontmatterField(await readScenarioAsset(name), 'description');
    return `- \`${name}\` —— ${desc}`;
  }));
  return [
    '# 可用业务场景（动笔前先选一个、再拉它的完整范式）',
    '',
    '先判断本需求最贴合下面哪个场景，然后用 `{{KWF}} skill show <场景名>` 把它的完整范式骨架与陷阱读出来，照着搭（拿不准就先读，不要凭空猜流程）：',
    '',
    ...lines,
  ].join('\n');
}

// System prompt for the scaffold (#design) step: universal + kwf + scaffold +
// the Kon cheatsheet (syntax authority) + the scenario index.
export async function assembleScaffoldSystemPrompt(): Promise<string> {
  const [universal, kwf, scaffold, cheatsheet, scenarioIndex] = await Promise.all([
    readPromptLayer('universal'),
    readPromptLayer('kwf'),
    readPromptLayer('scaffold'),
    readGenerationKernelAsset(),
    buildScenarioIndex(),
  ]);
  const composed = [
    universal,
    kwf,
    scaffold,
    `# Kon 语法速查表（cheatsheet · 语法权威）\n\n${cheatsheet}`,
    scenarioIndex,
  ].join(SECTION_SEP);
  return substituteKwf(composed);
}

// System prompt for the infer (#infer) step: universal + kwf + infer.
export async function assembleInferSystemPrompt(): Promise<string> {
  const [universal, kwf, infer] = await Promise.all([
    readPromptLayer('universal'),
    readPromptLayer('kwf'),
    readPromptLayer('infer'),
  ]);
  return substituteKwf([universal, kwf, infer].join(SECTION_SEP));
}

// Scenario skill text for `kwf skill show <name>`, with {{KWF}} resolved so the
// commands it suggests are directly runnable by the agent.
export async function getScenarioText(name: string): Promise<string> {
  return substituteKwf(await readScenarioAsset(name));
}
