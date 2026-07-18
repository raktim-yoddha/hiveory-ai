export type ModelSize = 'tiny.en' | 'base.en' | 'small.en' | 'medium.en';

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  durationMs: number;
  modelSize: ModelSize;
  segments: TranscriptionSegment[];
  cleaned: boolean;
}

export interface CleanupConfig {
  enabled: boolean;
  clean: (raw: string) => Promise<string>;
}

export interface VoiceConfig {
  modelSize: ModelSize;
  modelCacheDir?: string;
  cleanup?: CleanupConfig;
}

export type HotkeyAction = 'dictation' | 'voice-command';

export interface HotkeyBinding {
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}

export interface InjectionInput {
  text: string;
}

export interface VoiceEventMap {
  'dictation:start': [];
  'dictation:stop': [];
  'dictation:result': [result: TranscriptionResult];
  'dictation:error': [error: Error];
  'voice-command:result': [transcript: string];
  'voice-command:error': [error: Error];
  'model:downloading': [modelSize: ModelSize, progress: number];
  'model:ready': [modelSize: ModelSize];
  'model:error': [modelSize: ModelSize, error: Error];
}
