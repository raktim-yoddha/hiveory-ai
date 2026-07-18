import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
  spawn: vi.fn(),
}));

describe('WhisperCppEngine', () => {
  let engine: any;
  let testDir: string;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beevoice-test-'));
    vi.clearAllMocks();

    const { WhisperCppEngine } = await import('../src/engine/whisper-cpp.js');
    engine = new WhisperCppEngine(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('can be constructed with a cache directory', () => {
    expect(engine).toBeDefined();
  });

  it('isModelDownloaded returns false for non-existent model', async () => {
    const downloaded = await engine.isModelDownloaded('tiny.en');
    expect(downloaded).toBe(false);
  });

  it('getAvailableModels returns all four model sizes', async () => {
    const models = await engine.getAvailableModels();
    expect(models).toEqual(['tiny.en', 'base.en', 'small.en', 'medium.en']);
  });

  it('throws when audio file does not exist', async () => {
    await expect(
      engine.transcribe('/nonexistent/audio.wav', 'tiny.en')
    ).rejects.toThrow(/not found/);
  });

  it('transcribe rejects on execFile error', async () => {
    const { execFile } = await import('node:child_process');
    const wavPath = path.join(testDir, 'test.wav');
    fs.writeFileSync(wavPath, Buffer.alloc(1024));

    vi.mocked(execFile).mockImplementation((cmd: string, args: readonly string[] | undefined, options: any, callback?: (error: Error | null, stdout: string, stderr: string) => void) => {
      if (callback) callback(new Error('binary not found'), '', '');
      return { on: vi.fn() } as any;
    });

    await expect(engine.transcribe(wavPath, 'tiny.en')).rejects.toThrow();
  });
});

describe('model-cache', () => {
  it('getModelInfo returns correct data for each model size', async () => {
    const { getModelInfo } = await import('../src/engine/model-cache.js');

    const tiny = getModelInfo('tiny.en');
    expect(tiny.filename).toContain('tiny.en');
    expect(tiny.url).toContain('huggingface.co');

    const small = getModelInfo('small.en');
    expect(small.filename).toContain('small.en');

    const medium = getModelInfo('medium.en');
    expect(medium.filename).toContain('medium.en');
  });

  it('getModelPath combines cache directory with model filename', async () => {
    const { getModelPath } = await import('../src/engine/model-cache.js');
    const p = getModelPath('/cache/dir', 'tiny.en');
    expect(p).toContain(path.join('/cache/dir', 'models'));
    expect(p).toContain('ggml-tiny.en');
  });

  it('getBinaryInfo returns platform-specific binary info', async () => {
    const { getBinaryInfo } = await import('../src/engine/model-cache.js');
    const info = getBinaryInfo();
    expect(info.filename).toBeTruthy();
    expect(info.url).toContain('github.com');
  });

  it('resolveCacheDir falls back to platform default when no dir given', async () => {
    const { resolveCacheDir } = await import('../src/engine/model-cache.js');
    const dir = resolveCacheDir();
    expect(dir).toBeTruthy();
    expect(typeof dir).toBe('string');
  });

  it('resolveCacheDir uses user-provided dir when given', async () => {
    const { resolveCacheDir } = await import('../src/engine/model-cache.js');
    expect(resolveCacheDir('/custom/path')).toBe('/custom/path');
  });
});
