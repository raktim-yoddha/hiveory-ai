# `@hiveory/bee-voice` — Local-first voice layer for Hiveory

> **Status:** Isolated, testable package. Not yet wired into Hive/.

Provides two capabilities:
- **Type-anywhere dictation** — transcribe speech and inject it as text into whatever OS field has focus.
- **QueenBee voice command** — transcribe speech and return raw text for routing into QueenBee's tool-calling pipeline.

## Speech-to-text engine

Uses [whisper.cpp](https://github.com/ggerganov/whisper.cpp) via its CLI binary for fully local, offline STT. Models are downloaded on first use from [ggml-org/whisper.cpp](https://huggingface.co/ggml-org/whisper.cpp) on HuggingFace — never bundled in the package.

| Model | Quantization | Size |
| --- | --- | --- |
| `tiny.en` | q5\_1 | ~75 MB |
| `base.en` | q5\_1 | ~142 MB |
| `small.en` (default) | q5\_1 | ~466 MB |
| `medium.en` | q5\_1 | ~1.5 GB |

**No API key required.** Fully offline out of the box.

### Optional LLM cleanup

A post-processing step that sends dictation transcripts through an LLM for grammar cleanup, filler-word removal, and punctuation fixing. **Off by default.** When enabled, accepts an injectable `clean` callback — designed to reuse Hiveory's existing provider-key pattern without coupling to the Zustand store.

Cleanup is **never** applied to the QueenBee voice-command path (raw transcript goes straight to the LLM planner).

## Explicit boundaries

- No dependency on Hive/ or any other Hiveory package.
- No real global hotkeys registered — `HotkeyService` is an injectable interface with a `HotkeyServiceStub`.
- No OS keystroke injection — `InjectionService` is an injectable interface with an `InjectionServiceStub`.
- No LLM key storage — cleanup accepts an injected callback.
- No QueenBee pipeline integration — just produces clean transcript output.

## Usage

```ts
import { BeeVoice } from '@hiveory/bee-voice';

const voice = new BeeVoice({ modelSize: 'small.en' });

// Ensure the default model is downloaded (lazy on first transcribe otherwise)
await voice.ensureModel();

// Dictation mode — transcribe + cleanup (if enabled) + injection
const result = await voice.dictationTranscribe('/path/to/audio.wav');
console.log(result.text);

// Voice-command mode — raw transcript, no cleanup
const transcript = await voice.voiceCommandTranscribe('/path/to/audio.wav');

// Events for UI feedback
voice.on('model:downloading', (size, progress) => { /* show progress */ });
voice.on('model:ready', (size) => { /* hide spinner */ });
voice.on('dictation:result', (result) => { /* show in preview */ });
```

## Inject dependencies

```ts
const voice = new BeeVoice({
  modelSize: 'base.en',
  engine: myMockEngine,       // custom STT backend
  hotkeys: myHotkeyImpl,      // real hotkey registration
  injection: myInjectionImpl, // real keystroke injection
  cleanup: {
    enabled: true,
    clean: async (raw) => {
      // Use Hiveory's provider keys from Zustand
      const { data } = await callLLM({ system: 'cleanup', prompt: raw });
      return data;
    },
  },
});
```

## Package structure

```
BeeVoice/
  src/
    engine/          — WhisperCppEngine, model download/cache
    hotkeys/         — HotkeyService interface + stub
    injection/       — InjectionService interface + stub
    cleanup/         — Optional LLM cleanup (injectable)
    recorder/        — AudioRecorder interface + stub
    types.ts         — Shared types
    voice-processor.ts — BeeVoice orchestrator
    index.ts         — Public exports
  tests/             — Vitest unit tests
```

## Development

```bash
pnpm install
pnpm build          # tsc
pnpm test           # vitest run
```
