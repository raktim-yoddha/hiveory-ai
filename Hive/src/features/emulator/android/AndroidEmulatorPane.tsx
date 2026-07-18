"use client";

import { useEffect, useState } from "react";
import {
  Smartphone, Plus, Play, Square, Trash2, RefreshCw, Lock, AlertTriangle, Loader2,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useEmulatorStore } from "../emulatorStore";
import AvdBuildDialog from "./AvdBuildDialog";

/**
 * Android emulator surface: build/boot/stop AVDs.
 *
 * The live screen is not wired yet — that's the scrcpy H.264 pipeline (server
 * jar pushed over adb, frames read in Rust, decoded with WebCodecs). Until then
 * this manages devices and says so plainly rather than faking a viewport.
 */
export default function AndroidEmulatorPane() {
  const { sdk, devices, loading, error, refresh, refreshDevices } = useEmulatorStore();
  const [building, setBuilding] = useState(false);
  const [busyAvd, setBusyAvd] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => { refresh(); }, [refresh]);

  // Booting is async and adb only reports the device once it appears.
  useEffect(() => {
    refreshDevices();
    const t = setInterval(refreshDevices, 3000);
    return () => clearInterval(t);
  }, [refreshDevices]);

  const booted = new Set(devices.filter((d) => d.state === "device").map((d) => d.serial));
  const anyDeviceUp = devices.length > 0;

  const start = async (name: string) => {
    setBusyAvd(name);
    setActionError(null);
    try {
      await invoke("start_emulator", { name });
      // Boot takes ~20-40s; the poll above will surface it.
      setTimeout(() => setBusyAvd(null), 4000);
    } catch (e: any) {
      setActionError(String(e?.message ?? e));
      setBusyAvd(null);
    }
  };

  const stop = async (serial: string) => {
    try {
      await invoke("stop_emulator", { serial });
      await refreshDevices();
    } catch (e: any) {
      setActionError(String(e?.message ?? e));
    }
  };

  const remove = async (name: string) => {
    try {
      await invoke("delete_avd", { name });
      await refresh();
    } catch (e: any) {
      setActionError(String(e?.message ?? e));
    }
  };

  /* ── SDK missing: say exactly what's wrong ─────────────────── */
  if (!loading && sdk && !sdk.sdkPath) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <Smartphone className="size-5 text-bee-textMuted/50" />
        <p className="text-[11px] font-medium text-bee-err">Android SDK not found</p>
        <p className="max-w-[400px] text-[10px] leading-[1.5] text-bee-textMuted">
          Install Android Studio, or set <code className="text-bee-gold">ANDROID_HOME</code> to
          an existing SDK. Hiveory needs the <code className="text-bee-gold">emulator</code> and{" "}
          <code className="text-bee-gold">platform-tools</code> packages.
        </p>
        <button onClick={refresh} className="mt-1 rounded-md border border-bee-gold/30 bg-bee-gold/10 px-2.5 py-1 text-[10px] text-bee-goldHi hover:bg-bee-gold/20">
          Check again
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-bee-canvas">
      {/* Toolbar */}
      <div
        data-pane-drag
        className="flex h-8 shrink-0 cursor-grab items-center gap-1.5 border-b border-bee-gold/40 bg-gradient-to-r from-bee-gold/[0.18] to-bee-gold/[0.06] backdrop-blur-md px-2 active:cursor-grabbing"
      >
        <Smartphone className="size-3 shrink-0 text-bee-gold" />
        <span className="text-[11px] font-medium text-bee-text">Android</span>
        <span className="text-[9px] text-bee-textMuted">
          {sdk ? `${sdk.avds.length} built · ${devices.length} running` : "…"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => { refresh(); refreshDevices(); }}
            className="rounded p-0.5 text-bee-textMuted transition-colors hover:bg-bee-border/50 hover:text-bee-text"
            title="Refresh"
          >
            <RefreshCw className="size-3" />
          </button>
          <button
            onClick={() => setBuilding(true)}
            disabled={!sdk?.sdkPath}
            className="flex items-center gap-1 rounded border border-bee-gold/25 bg-bee-gold/10 px-1.5 py-0.5 text-[10px] text-bee-goldHi transition-colors hover:bg-bee-gold/20 disabled:opacity-40"
            title="Build a new emulator"
          >
            <Plus className="size-2.5" />
            Build
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek p-2">
        {loading && !sdk ? (
          <div className="flex h-full items-center justify-center gap-2 text-[11px] text-bee-textMuted">
            <Loader2 className="size-3 animate-spin" /> Looking for the Android SDK…
          </div>
        ) : sdk && sdk.avds.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <Smartphone className="size-5 text-bee-textMuted/50" />
            <p className="text-[11px] font-medium text-bee-textDim">No emulators yet</p>
            <p className="max-w-[340px] text-[10px] leading-[1.5] text-bee-textMuted">
              Build one to test your app. Pick the device, RAM and storage once —
              they're baked in, like a real phone.
            </p>
            <button
              onClick={() => setBuilding(true)}
              className="mt-1 rounded-md border border-bee-gold/30 bg-bee-gold/10 px-2.5 py-1 text-[10px] font-medium text-bee-goldHi hover:bg-bee-gold/20"
            >
              Build emulator
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {sdk?.avds.map((name) => {
              // adb serials are emulator-<port>, not the AVD name, so with one
              // emulator up we can only say "something is running".
              const running = anyDeviceUp;
              const serial = devices[0]?.serial;
              return (
                <div
                  key={name}
                  className="flex items-center gap-2 rounded-lg border border-bee-border/40 bg-bee-surface/60 px-2.5 py-2 transition-colors hover:border-bee-gold/30"
                >
                  <Smartphone className="size-3.5 shrink-0 text-bee-gold" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[11px] font-medium text-bee-text">{name}</span>
                      <Lock className="size-2.5 shrink-0 text-bee-textMuted/60" />
                    </div>
                    <span className="text-[9px] text-bee-textMuted">
                      {running && booted.has(serial ?? "")
                        ? `running · ${serial}`
                        : running
                        ? `booting · ${serial}`
                        : "stopped"}
                    </span>
                  </div>

                  {running ? (
                    <button
                      onClick={() => serial && stop(serial)}
                      className="rounded p-1 text-bee-textMuted transition-colors hover:bg-bee-err/20 hover:text-bee-err"
                      title="Stop"
                    >
                      <Square className="size-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => start(name)}
                      disabled={busyAvd === name}
                      className="rounded p-1 text-bee-textMuted transition-colors hover:bg-bee-gold/20 hover:text-bee-gold disabled:opacity-40"
                      title="Start"
                    >
                      {busyAvd === name ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
                    </button>
                  )}
                  <button
                    onClick={() => remove(name)}
                    disabled={running}
                    className="rounded p-1 text-bee-textMuted transition-colors hover:bg-bee-err/20 hover:text-bee-err disabled:opacity-30"
                    title={running ? "Stop it first" : "Delete"}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              );
            })}

            {/* Honest about the missing piece rather than faking a screen. */}
            <div className="mt-2 flex items-start gap-1.5 rounded-md border border-bee-border/40 bg-bee-canvasHi/40 px-2 py-1.5">
              <AlertTriangle className="mt-px size-3 shrink-0 text-bee-gold/70" />
              <span className="text-[9px] leading-[1.5] text-bee-textMuted">
                The emulator opens in its own window for now. The in-pane live
                screen (scrcpy) is the next step.
              </span>
            </div>
          </div>
        )}

        {(actionError || error) && (
          <div className="mt-2 flex items-start gap-1.5 px-1 text-[9px] text-bee-err">
            <AlertTriangle className="mt-px size-3 shrink-0" />
            <span>{actionError ?? error}</span>
          </div>
        )}
      </div>

      {building && sdk && (
        <AvdBuildDialog
          sdk={sdk}
          onClose={() => setBuilding(false)}
          onBuilt={async () => { setBuilding(false); await refresh(); }}
        />
      )}
    </div>
  );
}
