import { describe, it, expect } from 'vitest';
import type {
  ModelSize,
  TranscriptionResult,
  TranscriptionSegment,
  VoiceConfig,
  CleanupConfig,
  HotkeyAction,
  InjectionInput,
} from '../src/types.js';

describe('types', () => {
  it('ModelSize is a union of known model identifiers', () => {
    const validSizes: ModelSize[] = ['tiny.en', 'base.en', 'small.en', 'medium.en'];
    expect(validSizes).toHaveLength(4);
  });

  it('TranscriptionSegment has start, end, and text', () => {
    const seg: TranscriptionSegment = { start: 0.5, end: 2.0, text: 'hello world' };
    expect(seg.start).toBe(0.5);
    expect(seg.end).toBe(2.0);
    expect(seg.text).toBe('hello world');
  });

  it('TranscriptionResult has all required fields', () => {
    const result: TranscriptionResult = {
      text: 'hello world',
      durationMs: 1500,
      modelSize: 'small.en',
      segments: [],
      cleaned: false,
    };
    expect(result.text).toBe('hello world');
    expect(result.durationMs).toBe(1500);
    expect(result.modelSize).toBe('small.en');
    expect(result.cleaned).toBe(false);
  });

  it('CleanupConfig requires enabled and clean callback', () => {
    const config: CleanupConfig = {
      enabled: true,
      clean: async (raw: string) => raw.toUpperCase(),
    };
    expect(config.enabled).toBe(true);
    expect(typeof config.clean).toBe('function');
  });

  it('VoiceConfig accepts optional cleanup', () => {
    const config1: VoiceConfig = { modelSize: 'base.en' };
    expect(config1.modelSize).toBe('base.en');
    expect(config1.cleanup).toBeUndefined();

    const config2: VoiceConfig = {
      modelSize: 'small.en',
      cleanup: { enabled: false, clean: async (r: string) => r },
    };
    expect(config2.cleanup?.enabled).toBe(false);
  });

  it('HotkeyAction is either dictation or voice-command', () => {
    const actions: HotkeyAction[] = ['dictation', 'voice-command'];
    expect(actions).toHaveLength(2);
  });

  it('InjectionInput has text', () => {
    const input: InjectionInput = { text: 'injected text' };
    expect(input.text).toBe('injected text');
  });
});
