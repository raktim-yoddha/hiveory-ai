import { describe, it, expect } from 'vitest';
import { SearchEngine } from '../src/search/index.js';

// embedText/cosineSimilarity/sanitizeQuery are pure — they never touch the db,
// so the engine can be built without one to test the algorithms in isolation.
const engine = new SearchEngine(null as any);
const embed = (t: string): number[] => (engine as any)['embedText'](t);
const cosine = (a: number[], b: number[]): number => (engine as any)['cosineSimilarity'](a, b);
const sanitize = (t: string): string => (engine as any)['sanitizeQuery'](t);

const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));

describe('embedText', () => {
  it('is 384-dimensional', () => {
    expect(embed('hello world')).toHaveLength(384);
  });

  it('is deterministic — same text, same vector', () => {
    expect(embed('the quick brown fox')).toEqual(embed('the quick brown fox'));
  });

  it('is L2-normalised, so cosine == dot product', () => {
    expect(norm(embed('authentication middleware'))).toBeCloseTo(1, 6);
  });

  it('returns an all-zero vector for empty text (no NaN from divide-by-zero)', () => {
    const v = embed('');
    expect(v).toHaveLength(384);
    expect(v.every((x) => x === 0)).toBe(true);
  });
});

describe('cosineSimilarity', () => {
  it('scores identical text at ~1', () => {
    const v = embed('oauth login flow');
    expect(cosine(v, v)).toBeCloseTo(1, 6);
  });

  it('scores related text above unrelated text', () => {
    const query = embed('database schema migration');
    const related = cosine(query, embed('migrate the database schema'));
    const unrelated = cosine(query, embed('zzz'));
    expect(related).toBeGreaterThan(unrelated);
  });

  it('is clamped to [0,1] and safe on mismatched/empty input', () => {
    expect(cosine([], [])).toBe(0);
    expect(cosine([1, 0], [1, 0, 0])).toBe(0);
  });
});

describe('sanitizeQuery', () => {
  it('strips FTS syntax that would otherwise throw', () => {
    expect(sanitize('"quoted" (grouped) star*')).toBe('quoted grouped star');
  });

  it('strips leading dashes so terms are not read as NOT', () => {
    expect(sanitize('-foo --bar')).toBe('foo bar');
  });

  it('collapses whitespace and drops empty terms', () => {
    expect(sanitize('  a   b  ')).toBe('a b');
  });
});
