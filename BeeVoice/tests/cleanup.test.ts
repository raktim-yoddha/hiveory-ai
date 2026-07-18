import { describe, it, expect, vi } from 'vitest';

describe('cleanup', () => {
  it('createCleanupService returns result without calling clean when disabled', async () => {
    const { createCleanupService } = await import('../src/cleanup/index.js');
    const cleanFn = vi.fn(async (r: string) => r.toUpperCase());
    const svc = createCleanupService({ enabled: false, clean: cleanFn });
    const result = await svc.clean('hello world');
    expect(result).toBe('hello world');
    expect(cleanFn).not.toHaveBeenCalled();
  });

  it('createCleanupService calls clean when enabled', async () => {
    const { createCleanupService } = await import('../src/cleanup/index.js');
    const cleanFn = vi.fn(async (r: string) => r.replace(/\s+/g, ' ').trim());
    const svc = createCleanupService({ enabled: true, clean: cleanFn });
    const result = await svc.clean('hello   world  foo');
    expect(result).toBe('hello world foo');
    expect(cleanFn).toHaveBeenCalledWith('hello   world  foo');
  });

  it('NoopCleanupService returns input unchanged', async () => {
    const { NoopCleanupService } = await import('../src/cleanup/index.js');
    const svc = new NoopCleanupService();
    expect(await svc.clean('any text')).toBe('any text');
    expect(await svc.clean('')).toBe('');
  });
});
