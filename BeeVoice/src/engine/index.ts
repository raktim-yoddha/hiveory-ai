import type { ModelSize, TranscriptionResult } from '../types.js';

export interface STTEngine {
  transcribe(audioPath: string, modelSize?: ModelSize): Promise<TranscriptionResult>;
  ensureModel(modelSize: ModelSize): Promise<void>;
  isModelDownloaded(modelSize: ModelSize): Promise<boolean>;
  getAvailableModels(): Promise<ModelSize[]>;
}

/**
 * Default engine when none is injected. Constructs fine (so `new BeeVoice()`
 * works in any environment) but throws the moment you try to transcribe — the
 * real engine (`WhisperCppEngine` in Node, or a host-supplied Tauri adapter)
 * must be provided. This keeps the package's core free of `node:` imports.
 */
export class EngineStub implements STTEngine {
  private fail(): never {
    throw new Error(
      'BeeVoice: no STTEngine provided. Inject WhisperCppEngine (Node) or a host engine adapter.',
    );
  }
  async transcribe(): Promise<TranscriptionResult> { this.fail(); }
  async ensureModel(): Promise<void> { this.fail(); }
  async isModelDownloaded(): Promise<boolean> { return false; }
  async getAvailableModels(): Promise<ModelSize[]> { return []; }
}
