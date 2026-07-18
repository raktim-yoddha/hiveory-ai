import type { ModelSize, VoiceConfig, TranscriptionResult } from './types.js';
import type { STTEngine } from './engine/index.js';
import type { HotkeyService } from './hotkeys/index.js';
import type { InjectionService } from './injection/index.js';
import type { AudioRecorder } from './recorder/index.js';
// EngineStub, not WhisperCppEngine: importing the Node engine here would pull
// node:child_process into every consumer, including the Tauri renderer.
import { EngineStub } from './engine/index.js';
import { HotkeyServiceStub } from './hotkeys/index.js';
import { InjectionServiceStub } from './injection/index.js';
import { AudioRecorderStub } from './recorder/index.js';
import { createCleanupService, NoopCleanupService } from './cleanup/index.js';
import type { CleanupService } from './cleanup/index.js';

type EventHandler = (...args: any[]) => void;

export class BeeVoice {
  private engine: STTEngine;
  private hotkeys: HotkeyService;
  private injection: InjectionService;
  private recorder: AudioRecorder;
  private cleanup: CleanupService;
  private config: VoiceConfig;
  private listeners = new Map<string, Set<EventHandler>>();

  constructor(config: Partial<VoiceConfig> & { engine?: STTEngine; hotkeys?: HotkeyService; injection?: InjectionService; recorder?: AudioRecorder } = {}) {
    this.config = {
      modelSize: config.modelSize ?? 'small.en',
      modelCacheDir: config.modelCacheDir,
      cleanup: config.cleanup,
    };
    this.engine = config.engine ?? new EngineStub();
    this.hotkeys = config.hotkeys ?? new HotkeyServiceStub();
    this.injection = config.injection ?? new InjectionServiceStub();
    this.recorder = config.recorder ?? new AudioRecorderStub();
    this.cleanup = this.config.cleanup
      ? createCleanupService(this.config.cleanup)
      : new NoopCleanupService();
  }

  on<K extends keyof import('./types.js').VoiceEventMap>(event: K, handler: (...args: import('./types.js').VoiceEventMap[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);
  }

  off<K extends keyof import('./types.js').VoiceEventMap>(event: K, handler: (...args: import('./types.js').VoiceEventMap[K]) => void): void {
    this.listeners.get(event)?.delete(handler as EventHandler);
  }

  private emit<K extends keyof import('./types.js').VoiceEventMap>(event: K, ...args: import('./types.js').VoiceEventMap[K]): void {
    this.listeners.get(event)?.forEach((h) => h(...args));
  }

  async setModelSize(size: ModelSize): Promise<void> {
    this.config.modelSize = size;
    await this.engine.ensureModel(size);
    this.emit('model:ready', size);
  }

  async ensureModel(size?: ModelSize): Promise<void> {
    const model = size ?? this.config.modelSize;
    this.emit('model:downloading', model, 0);
    try {
      await this.engine.ensureModel(model);
      this.emit('model:ready', model);
    } catch (err) {
      this.emit('model:error', model, err as Error);
      throw err;
    }
  }

  async transcribeFile(audioPath: string, options?: { modelSize?: ModelSize }): Promise<TranscriptionResult> {
    const model = options?.modelSize ?? this.config.modelSize;
    return this.engine.transcribe(audioPath, model);
  }

  async dictationTranscribe(audioPath: string): Promise<TranscriptionResult> {
    this.emit('dictation:start');
    try {
      const raw = await this.engine.transcribe(audioPath, this.config.modelSize);
      const text = await this.cleanup.clean(raw.text);
      const result: TranscriptionResult = { ...raw, text, cleaned: text !== raw.text };
      this.emit('dictation:result', result);
      await this.injection.inject({ text: result.text });
      return result;
    } catch (err) {
      this.emit('dictation:error', err as Error);
      throw err;
    } finally {
      this.emit('dictation:stop');
    }
  }

  async voiceCommandTranscribe(audioPath: string): Promise<string> {
    try {
      const result = await this.engine.transcribe(audioPath, this.config.modelSize);
      this.emit('voice-command:result', result.text);
      return result.text;
    } catch (err) {
      this.emit('voice-command:error', err as Error);
      throw err;
    }
  }

  async start(): Promise<void> {
    await this.hotkeys.start();
  }

  async stop(): Promise<void> {
    await this.hotkeys.stop();
  }
}
