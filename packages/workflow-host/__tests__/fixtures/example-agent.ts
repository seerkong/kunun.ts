// Keyword-driven mock agent used by the examples end-to-end tests. Examples
// keep realistic prompts; this fixture answers with canned, shape-correct
// payloads keyed on distinctive prompt phrases.
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

const prompt = await readStdin();

function reply(value: unknown): void {
  console.log(typeof value === 'string' ? value : JSON.stringify(value));
}

if (prompt.includes('Plan research angles')) {
  reply({
    angles: [
      { id: 'rate-limit', question: 'How does token refill work?', searchQueries: ['token bucket refill'] },
      { id: 'burst', question: 'How are bursts bounded?', searchQueries: ['token bucket burst capacity'] },
    ],
  });
} else if (prompt.includes('Classify this request')) {
  reply({ category: 'frontend' });
} else if (prompt.includes('List factual claims')) {
  reply({ claims: ['claim: refill is periodic', 'claim: bursts are capped'] });
} else if (prompt.includes('Challenge this claim')) {
  reply({ verdict: prompt.includes('bursts are capped') ? 'refuted' : 'survives' });
} else if (prompt.includes('previously unseen issues only')) {
  if (prompt.includes('round 0')) {
    reply({ findings: ['race condition in queue', 'missing timeout guard'], count: 2 });
  } else {
    reply({ findings: [], count: 0 });
  }
} else {
  reply(`mockreply: ${prompt.split('\n')[0].slice(0, 80)}`);
}
