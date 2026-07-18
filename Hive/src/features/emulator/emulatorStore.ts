import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { imagePlayStore, type SystemImage } from "./android/avd";

/** Mirrors the Rust `AndroidSdkStatus` (serde keeps snake_case). */
interface RawSdkStatus {
  sdk_path: string | null;
  avd_home: string;
  has_emulator: boolean;
  has_adb: boolean;
  images: { api_dir: string; tag_dir: string; abi: string; play_store: boolean }[];
  avds: string[];
}

export interface AndroidDevice {
  serial: string;
  /** "device" once booted; "offline" while starting. */
  state: string;
}

export interface SdkStatus {
  sdkPath: string | null;
  avdHome: string;
  hasEmulator: boolean;
  hasAdb: boolean;
  images: SystemImage[];
  avds: string[];
}

function imageLabel(apiDir: string, tagDir: string, abi: string): string {
  const api = apiDir.replace(/^android-/, "");
  return `Android ${api} · ${imagePlayStore(tagDir) ? "Google Play" : "Google APIs"} · ${abi}`;
}

interface EmulatorState {
  sdk: SdkStatus | null;
  devices: AndroidDevice[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshDevices: () => Promise<void>;
}

export const useEmulatorStore = create<EmulatorState>((set) => ({
  sdk: null,
  devices: [],
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const raw = await invoke<RawSdkStatus>("android_sdk_status");
      set({
        sdk: {
          sdkPath: raw.sdk_path,
          avdHome: raw.avd_home,
          hasEmulator: raw.has_emulator,
          hasAdb: raw.has_adb,
          avds: raw.avds,
          images: raw.images.map((i) => ({
            apiDir: i.api_dir,
            tagDir: i.tag_dir,
            abi: i.abi,
            playStore: i.play_store,
            label: imageLabel(i.api_dir, i.tag_dir, i.abi),
          })),
        },
        loading: false,
      });
    } catch (e: any) {
      set({ error: String(e?.message ?? e), loading: false });
    }
  },

  refreshDevices: async () => {
    try {
      set({ devices: await invoke<AndroidDevice[]>("android_devices") });
    } catch {
      set({ devices: [] });
    }
  },
}));
