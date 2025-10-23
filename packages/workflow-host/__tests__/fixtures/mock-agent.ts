// Mock agent CLI for workflow-host tests. Reads the prompt from stdin and
// answers deterministically based on directives embedded in the prompt:
//   ECHO:<text>            -> prints <text>
//   JSON:{...}             -> prints the JSON payload verbatim
//   NEED_CORRECTION_JSON   -> prints invalid JSON unless the prompt contains
//                             the correction marker, then prints {"fixed":true}
//   FAIL                   -> exits non-zero
// Anything else            -> prints "mock:" + first line of the prompt
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

const prompt = await readStdin();

if (prompt.includes('FAIL')) {
  console.error('mock agent forced failure');
  process.exit(3);
}

const jsonMatch = prompt.match(/JSON:(\{[\s\S]*?\})(?:\n|$)/);
if (prompt.includes('NEED_CORRECTION_JSON')) {
  if (prompt.includes('did not satisfy the required schema')) {
    console.log('{"fixed": true}');
  } else {
    console.log('this is not json at all');
  }
} else if (jsonMatch != null) {
  console.log(jsonMatch[1]);
} else {
  const echoMatch = prompt.match(/ECHO:([^\n]*)/);
  if (echoMatch != null) {
    console.log(echoMatch[1]);
  } else {
    console.log(`mock:${prompt.split('\n')[0]}`);
  }
}
