/**
 * Node entry point: the pure core plus the Node whisper.cpp engine + model
 * cache. Browser/renderer hosts must import `@hiveory/bee-voice/core` and inject
 * their own engine — importing this file pulls `node:child_process`/`node:fs`.
 */
export * from './core.js';

export { WhisperCppEngine } from './engine/whisper-cpp.js';
export {
  getModelInfo, getModelPath, getBinaryInfo, getBinaryPath, resolveCacheDir,
} from './engine/model-cache.js';
