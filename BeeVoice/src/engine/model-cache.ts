import type { ModelSize } from '../types.js';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import os from 'node:os';

export interface ModelInfo {
  filename: string;
  url: string;
  sizeBytes: number;
}

const MODEL_REGISTRY: Record<ModelSize, ModelInfo> = {
  'tiny.en': {
    filename: 'ggml-tiny.en-q5_1.bin',
    url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-tiny.en-q5_1.bin',
    sizeBytes: 75_000_000,
  },
  'base.en': {
    filename: 'ggml-base.en-q5_1.bin',
    url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-base.en-q5_1.bin',
    sizeBytes: 142_000_000,
  },
  'small.en': {
    filename: 'ggml-small.en-q5_1.bin',
    url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-small.en-q5_1.bin',
    sizeBytes: 466_000_000,
  },
  'medium.en': {
    filename: 'ggml-medium.en-q5_1.bin',
    url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-medium.en-q5_1.bin',
    sizeBytes: 1_500_000_000,
  },
};

export interface BinaryInfo {
  filename: string;
  url: string;
}

export function getModelInfo(size: ModelSize): ModelInfo {
  return MODEL_REGISTRY[size];
}

export function getModelPath(cacheDir: string, size: ModelSize): string {
  return path.join(cacheDir, 'models', MODEL_REGISTRY[size].filename);
}

export function getBinaryInfo(): BinaryInfo {
  const platform = os.platform();
  const arch = os.arch();

  const version = '1.7.4';

  if (platform === 'win32') {
    return {
      filename: `whisper-cli-windows-x64-${version}.zip`,
      url: `https://github.com/ggerganov/whisper.cpp/releases/download/v${version}/whisper-cli-windows-x64-${version}.zip`,
    };
  }
  if (platform === 'darwin') {
    const archSuffix = arch === 'arm64' ? 'arm64' : 'x64';
    return {
      filename: `whisper-cli-macos-${archSuffix}-${version}.tar.gz`,
      url: `https://github.com/ggerganov/whisper.cpp/releases/download/v${version}/whisper-cli-macos-${archSuffix}-${version}.tar.gz`,
    };
  }
  return {
    filename: `whisper-cli-linux-x64-${version}.tar.gz`,
    url: `https://github.com/ggerganov/whisper.cpp/releases/download/v${version}/whisper-cli-linux-x64-${version}.tar.gz`,
  };
}

export function getBinaryPath(cacheDir: string): string {
  const platform = os.platform();
  const binaryName = platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli';
  return path.join(cacheDir, 'bin', binaryName);
}

function getCacheDir(): string {
  const platform = os.platform();
  const base = platform === 'win32'
    ? process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming')
    : platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support')
      : process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache');
  return path.join(base, 'hiveory', 'bee-voice');
}

export function resolveCacheDir(userDir?: string): string {
  return userDir ?? getCacheDir();
}

export function ensureDirectory(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ensureDirectory(path.dirname(dest));

    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;

    lib.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirect = response.headers.location;
        if (redirect) {
          downloadFile(redirect, dest).then(resolve).catch(reject);
          return;
        }
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${response.statusCode} for ${url}`));
        return;
      }

      const fileStream = fs.createWriteStream(dest);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      fileStream.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

export { downloadFile };
