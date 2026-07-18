import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { STTEngine } from '../src/engine/index.js';
import type { TranscriptionResult, ModelSize } from '../src/types.js';

function makeFakeEngine(): STTEngine {
  return {
    transcribe: vi.fn(async (_path: string, _size?: ModelSize): Promise<TranscriptionResult> => ({
      text: 'hello world',
      durationMs: 500,
      modelSize: _size ?? 'small.en',
      segments: [{ start: 0, end: 2, text: 'hello world' }],
      cleaned: false,
    })),
    ensureModel: vi.fn(async () => {}),
    isModelDownloaded: vi.fn(async () => true),
    getAvailableModels: vi.fn(async () => ['tiny.en', 'base.en', 'small.en', 'medium.en']),
  };
}

describe('BeeVoice', () => {
  let BeeVoice: typeof import('../src/voice-processor.js').BeeVoice;

  beforeEach(async () => {
    const mod = await import('../src/voice-processor.js');
    BeeVoice = mod.BeeVoice;
  });

  it('can be constructed with default config', () => {
    const bv = new BeeVoice();
    expect(bv).toBeDefined();
  });

  it('can be constructed with injected engine', () => {
    const bv = new BeeVoice({ engine: makeFakeEngine() });
    expect(bv).toBeDefined();
  });

  it('transcribeFile delegates to engine', async () => {
    const engine = makeFakeEngine();
    const bv = new BeeVoice({ engine });
    const result = await bv.transcribeFile('/test/audio.wav', { modelSize: 'base.en' });
    expect(result.text).toBe('hello world');
    expect(result.modelSize).toBe('base.en');
    expect(engine.transcribe).toHaveBeenCalledWith('/test/audio.wav', 'base.en');
  });

  it('dictationTranscribe applies cleanup when configured', async () => {
    const engine = makeFakeEngine();
    const cleaned = vi.fn(async (raw: string) => raw.replace('hello', 'greetings'));
    const bv = new BeeVoice({
      engine,
      cleanup: { enabled: true, clean: cleaned },
    });
    const result = await bv.dictationTranscribe('/test/audio.wav');
    expect(result.text).toBe('greetings world');
    expect(result.cleaned).toBe(true);
    expect(cleaned).toHaveBeenCalledWith('hello world');
  });

  it('dictationTranscribe skips cleanup when disabled', async () => {
    const engine = makeFakeEngine();
    const bv = new BeeVoice({ engine });
    const result = await bv.dictationTranscribe('/test/audio.wav');
    expect(result.text).toBe('hello world');
    expect(result.cleaned).toBe(false);
  });

  it('voiceCommandTranscribe returns raw text without cleanup', async () => {
    const engine = makeFakeEngine();
    const bv = new BeeVoice({
      engine,
      cleanup: { enabled: true, clean: async (r: string) => r.toUpperCase() },
    });
    const text = await bv.voiceCommandTranscribe('/test/audio.wav');
    expect(text).toBe('hello world');
  });

  it('emits events during dictation flow', async () => {
    const engine = makeFakeEngine();
    const bv = new BeeVoice({ engine });
    const start = vi.fn();
    const stop = vi.fn();
    const result = vi.fn();

    bv.on('dictation:start', start);
    bv.on('dictation:stop', stop);
    bv.on('dictation:result', result);

    await bv.dictationTranscribe('/test/audio.wav');

    expect(start).toHaveBeenCalledTimes(1);
    expect(result).toHaveBeenCalledTimes(1);
    expect(result).toHaveBeenCalledWith(expect.objectContaining({ text: 'hello world' }));
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('emits error event when dictation fails', async () => {
    const failingEngine: STTEngine = {
      ...makeFakeEngine(),
      transcribe: vi.fn(async () => { throw new Error('STT failed'); }),
    };
    const bv = new BeeVoice({ engine: failingEngine });
    const error = vi.fn();
    bv.on('dictation:error', error);

    await expect(bv.dictationTranscribe('/test/audio.wav')).rejects.toThrow('STT failed');
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'STT failed' }));
  });

  it('emits events for voice command flow', async () => {
    const engine = makeFakeEngine();
    const bv = new BeeVoice({ engine });
    const result = vi.fn();
    bv.on('voice-command:result', result);

    const text = await bv.voiceCommandTranscribe('/test/audio.wav');
    expect(text).toBe('hello world');
    expect(result).toHaveBeenCalledWith('hello world');
  });

  it('setModelSize delegates to engine.ensureModel', async () => {
    const engine = makeFakeEngine();
    const bv = new BeeVoice({ engine });
    await bv.setModelSize('base.en');
    expect(engine.ensureModel).toHaveBeenCalledWith('base.en');
  });

  it('ensureModel emits download events', async () => {
    const engine = makeFakeEngine();
    const bv = new BeeVoice({ engine });
    const downloading = vi.fn();
    const ready = vi.fn();
    bv.on('model:downloading', downloading);
    bv.on('model:ready', ready);

    await bv.ensureModel('tiny.en');
    expect(downloading).toHaveBeenCalledWith('tiny.en', 0);
    expect(ready).toHaveBeenCalledWith('tiny.en');
  });

  it('can start and stop', async () => {
    const bv = new BeeVoice();
    await bv.start();
    await bv.stop();
  });
});
