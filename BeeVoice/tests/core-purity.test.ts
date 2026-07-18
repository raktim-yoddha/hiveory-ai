import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

// Files that ARE allowed Node built-ins (the whole point of the split).
const NODE_ALLOWED = new Set(['engine/whisper-cpp.ts', 'engine/model-cache.ts', 'index.ts']);

function sources(dir: string, base = dir): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sources(p, base);
    return e.name.endsWith('.ts') ? [path.relative(base, p).replace(/\\/g, '/')] : [];
  });
}

describe('core purity', () => {
  const files = sources(SRC).filter((f) => !NODE_ALLOWED.has(f));

  it('has a core to guard', () => {
    expect(files).toContain('voice-processor.ts');
    expect(files).toContain('core.ts');
  });

  it.each(files)('%s has no node: imports', (rel) => {
    const code = fs.readFileSync(path.join(SRC, rel), 'utf-8');
    const imports = code.match(/(?:from|import)\s*\(?\s*['"]node:[^'"]+['"]/g) ?? [];
    expect(imports).toEqual([]);
  });
});
