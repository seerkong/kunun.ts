// Minimal JSON Schema support: enough for workflow output_schema contracts
// (type/object/properties/required/array/items/minItems/enum). Not a full
// validator by design; complex schemas can be layered on later.

export function extractJsonCandidates(text: string): string[] {
  const candidates: string[] = [];
  const fenced = text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g);
  for (const match of fenced) {
    candidates.push(match[1].trim());
  }
  const balanced = extractBalancedSpan(text);
  if (balanced != null) {
    candidates.push(balanced);
  }
  candidates.push(text.trim());
  return candidates;
}

function extractBalancedSpan(text: string): string | null {
  const start = text.search(/[[{]/);
  if (start < 0) {
    return null;
  }
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') {
        i += 1;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === open) {
      depth += 1;
    } else if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

export function parseJsonReply(text: string): any {
  for (const candidate of extractJsonCandidates(text)) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next candidate
    }
  }
  throw new Error('No parseable JSON found in agent reply');
}

export function validateAgainstSchema(value: any, schema: any, path = '$'): string[] {
  const errors: string[] = [];
  if (schema == null || typeof schema !== 'object') {
    return errors;
  }
  const type = schema.type;
  if (type === 'object') {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return [`${path}: expected object`];
    }
    for (const required of schema.required ?? []) {
      if (!(required in value)) {
        errors.push(`${path}: missing required property "${required}"`);
      }
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (key in value) {
        errors.push(...validateAgainstSchema(value[key], childSchema, `${path}.${key}`));
      }
    }
  } else if (type === 'array') {
    if (!Array.isArray(value)) {
      return [`${path}: expected array`];
    }
    if (schema.minItems != null && value.length < schema.minItems) {
      errors.push(`${path}: expected at least ${schema.minItems} items, got ${value.length}`);
    }
    if (schema.items != null) {
      value.forEach((item, index) => {
        errors.push(...validateAgainstSchema(item, schema.items, `${path}[${index}]`));
      });
    }
  } else if (type === 'string' && typeof value !== 'string') {
    errors.push(`${path}: expected string`);
  } else if (type === 'number' && typeof value !== 'number') {
    errors.push(`${path}: expected number`);
  } else if (type === 'boolean' && typeof value !== 'boolean') {
    errors.push(`${path}: expected boolean`);
  }
  if (schema.enum != null && !schema.enum.some((allowed: any) => JSON.stringify(allowed) === JSON.stringify(value))) {
    errors.push(`${path}: value not in enum`);
  }
  return errors;
}
