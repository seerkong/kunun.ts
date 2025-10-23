import { KnConverter } from 'kunun-converter/KnConverter';

export function ParseKonSourceItems(source: string): any[] {
  return SplitTopLevelExpressions(source).map(expr => KnConverter.Kon.Parser.Parse(expr));
}

export function SplitTopLevelExpressions(source: string): string[] {
  const result: string[] = [];
  let start = -1;
  let depth = 0;
  let quote: '"' | "'" = null;
  let escape = false;
  let pendingAnnotationPrefix = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quote != null) {
      if (escape) {
        escape = false;
      } else if (quote === '"' && ch === '\\') {
        escape = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }

    // Skip `//` line comments (outside of any string literal). The comment runs
    // to the end of the current line and is treated as whitespace: if it ends a
    // pending top-level token, that token is flushed first.
    if (ch === '/' && source[i + 1] === '/') {
      if (depth === 0 && start >= 0) {
        const expr = source.slice(start, i).trim();
        if (isStandaloneAnnotationPrefix(expr, source, i)) {
          pendingAnnotationPrefix = true;
        } else {
          if (pendingAnnotationPrefix && expr.length > 0 && expr.startsWith('#(')) {
            result.push(expr);
            pendingAnnotationPrefix = false;
          } else if (expr.length > 0) {
            result.push(expr);
            pendingAnnotationPrefix = false;
          }
        }
        start = -1;
      }
      while (i < source.length && source[i] !== '\n') {
        i++;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch as '"' | "'";
      if (start < 0) {
        start = i;
      }
      continue;
    }

    if (ch === '(' || ch === '[' || ch === '{') {
      if (depth === 0 && start < 0) {
        start = i;
      }
      depth++;
      continue;
    }

    if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        const expr = source.slice(start, i + 1).trim();
        if (isStandaloneAnnotationPrefix(expr, source, i + 1)) {
          pendingAnnotationPrefix = true;
          continue;
        }
        if (expr.length > 0) {
          result.push(expr);
        }
        pendingAnnotationPrefix = false;
        start = -1;
      }
      continue;
    }

    if (!/\s/.test(ch) && start < 0) {
      start = i;
    }

    if (depth === 0 && start >= 0 && /\s/.test(ch)) {
      const expr = source.slice(start, i).trim();
      if (isStandaloneAnnotationPrefix(expr, source, i)) {
        pendingAnnotationPrefix = true;
        continue;
      }
      if (pendingAnnotationPrefix && expr.length > 0 && expr.startsWith('#(')) {
        result.push(expr);
        pendingAnnotationPrefix = false;
        start = -1;
        continue;
      }
      if (expr.length > 0) {
        result.push(expr);
      }
      pendingAnnotationPrefix = false;
      start = -1;
    }
  }

  if (start >= 0) {
    const expr = source.slice(start).trim();
    if (expr.length > 0) {
      result.push(expr);
    }
  }

  return result;
}

function isStandaloneAnnotationPrefix(expr: string, source: string, nextIndex: number): boolean {
  if (!expr.startsWith('#(')) {
    return false;
  }
  if (!containsOnlyOneTopLevelForm(expr.slice(1))) {
    return false;
  }
  let index = nextIndex;
  while (index < source.length && /\s/.test(source[index])) {
    index++;
  }
  return source[index] === '(';
}

function containsOnlyOneTopLevelForm(source: string): boolean {
  let depth = 0;
  let closedAt = -1;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) {
        closedAt = i;
        break;
      }
    }
  }
  if (closedAt < 0) {
    return false;
  }
  return source.slice(closedAt + 1).trim().length === 0;
}
