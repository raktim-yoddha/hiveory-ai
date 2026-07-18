/**
 * Pure core — safe to import anywhere, including a browser/Tauri renderer.
 * Contains no `node:` imports (whisper-cpp + model-cache stay in the Node
 * entry). Hosts inject their own `STTEngine` and `AudioRecorder`.
 */
export { BeeVoice } from './voice-processor.js';

export type { STTEngine } from './engine/index.js';
export { EngineStub } from './engine/index.js';

export type { HotkeyService } from './hotkeys/index.js';
export { HotkeyServiceStub } from './hotkeys/index.js';

export type { InjectionService } from './injection/index.js';
export { InjectionServiceStub } from './injection/index.js';

export type { CleanupService } from './cleanup/index.js';
export { createCleanupService, NoopCleanupService } from './cleanup/index.js';

export type { AudioRecorder } from './recorder/index.js';
export { AudioRecorderStub } from './recorder/index.js';

export type {
  ModelSize,
  TranscriptionSegment,
  TranscriptionResult,
  CleanupConfig,
  VoiceConfig,
  HotkeyAction,
  HotkeyBinding,
  InjectionInput,
  VoiceEventMap,
} from './types.js';
