import { invoke } from "@tauri-apps/api/core";
import type { STTEngine, AudioRecorder, ModelSize, TranscriptionResult } from "@hiveory/bee-voice/core";

/**
 * BeeVoice ports, implemented for the Tauri renderer.
 *
 * BeeVoice owns the orchestration (events, cleanup, dictation vs command). Hive
 * only supplies the two things a browser can't do portably: run whisper.cpp
 * (Rust) and capture the microphone (WebAudio → 16kHz mono WAV). No STT logic
 * lives here.
 */

interface RustBeeVoiceStatus {
  cache_dir: string;
  has_binary: boolean;
  binary_path: string | null;
  installed_models: string[];
}

function normalize(s: RustBeeVoiceStatus) {
  return {
    cacheDir: s.cache_dir,
    hasBinary: s.has_binary,
    binaryPath: s.binary_path,
    installedModels: s.installed_models,
  };
}

export async function whisperStatus() {
  return normalize(await invoke<RustBeeVoiceStatus>("bee_voice_status"));
}

/** Download + install whisper.cpp binary + a model into the shared cache. */
export async function whisperInstall(model = "base.en") {
  return normalize(await invoke<RustBeeVoiceStatus>("bee_voice_install", { model }));
}

/** Ready to transcribe = binary present AND at least one model installed. */
export function isVoiceReady(s: { hasBinary: boolean; installedModels: string[] }): boolean {
  return s.hasBinary && s.installedModels.length > 0;
}

/**
 * whisper emits bracketed non-speech tokens for silence ([BLANK_AUDIO],
 * [ Silence ], [MUSIC], (inaudible)…). Strip them so an empty/near-silent clip
 * yields "" rather than typing "[BLANK_AUDIO]".
 */
export function cleanTranscript(raw: string): string {
  return raw
    .replace(/\[[^\]]*\]/g, " ")            // [BLANK_AUDIO], [ Silence ], [MUSIC]
    .replace(/\((?:inaudible|music|silence|blank[^)]*)\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Runs whisper.cpp via Rust on a WAV file path. */
export class TauriWhisperEngine implements STTEngine {
  async transcribe(audioPath: string, modelSize: ModelSize = "base.en"): Promise<TranscriptionResult> {
    const started = Date.now();
    const text = await invoke<string>("bee_voice_transcribe", { wavPath: audioPath, model: modelSize });
    return {
      text,
      durationMs: Date.now() - started,
      modelSize,
      segments: text ? [{ text, startMs: 0, endMs: Date.now() - started }] as any : [],
      cleaned: false,
    };
  }
  async ensureModel(): Promise<void> { /* models are managed by the bee-voice cache */ }
  async isModelDownloaded(model: ModelSize): Promise<boolean> {
    return (await whisperStatus()).installedModels.includes(model);
  }
  async getAvailableModels(): Promise<ModelSize[]> {
    return (await whisperStatus()).installedModels as ModelSize[];
  }
}

/**
 * Captures the mic, then produces a 16kHz mono 16-bit WAV (what whisper wants)
 * and hands it to Rust, which writes a temp file and returns its path.
 */
export class BrowserAudioRecorder implements AudioRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private recording = false;

  async startRecording(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
    this.recorder.start();
    this.recording = true;
  }

  async stopRecording(): Promise<string> {
    if (!this.recorder) throw new Error("not recording");
    const blob: Blob = await new Promise((resolve) => {
      this.recorder!.onstop = () => resolve(new Blob(this.chunks, { type: this.chunks[0]?.type }));
      this.recorder!.stop();
    });
    this.recording = false;
    this.stream?.getTracks().forEach((t) => t.stop());

    const wavB64 = await blobToWav16kB64(blob);
    return invoke<string>("bee_voice_save_wav", { dataB64: wavB64 });
  }

  isRecording(): boolean { return this.recording; }
}

/** Decode arbitrary recorded audio → resample to 16kHz mono → PCM16 WAV → base64. */
async function blobToWav16kB64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(buf);
  ctx.close();

  const targetRate = 16000;
  const mono = downmixMono(decoded);
  const resampled = resampleLinear(mono, decoded.sampleRate, targetRate);
  const wav = encodeWav16(resampled, targetRate);
  return arrayBufferToBase64(wav);
}

function downmixMono(b: AudioBuffer): Float32Array {
  if (b.numberOfChannels === 1) return b.getChannelData(0);
  const out = new Float32Array(b.length);
  for (let c = 0; c < b.numberOfChannels; c++) {
    const ch = b.getChannelData(c);
    for (let i = 0; i < b.length; i++) out[i] += ch[i] / b.numberOfChannels;
  }
  return out;
}

function resampleLinear(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const frac = src - i0;
    out[i] = (input[i0] ?? 0) * (1 - frac) + (input[i0 + 1] ?? 0) * frac;
  }
  return out;
}

function encodeWav16(samples: Float32Array, rate: number): ArrayBuffer {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const dv = new DataView(buf);
  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, "RIFF"); dv.setUint32(4, 36 + samples.length * 2, true); ws(8, "WAVE");
  ws(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  ws(36, "data"); dv.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    dv.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
