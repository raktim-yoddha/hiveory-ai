"use client";

import { useState } from "react";
import { X, Smartphone, Lock, AlertTriangle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import {
  DEVICE_PROFILES, RAM_CHOICES, STORAGE_CHOICES,
  sanitizeAvdName, validateSpec, buildAvdIni, buildConfigIni,
  type AvdSpec, type SystemImage,
} from "./avd";
import type { SdkStatus } from "../emulatorStore";

interface Props {
  sdk: SdkStatus;
  onClose: () => void;
  onBuilt: (name: string) => void;
}

/**
 * Build an emulator. Hardware picked here is permanent — the emulator boots a
 * userdata image sized to these values, so changing them later would mean
 * rebuilding anyway. Same as ordering a real phone.
 */
export default function AvdBuildDialog({ sdk, onClose, onBuilt }: Props) {
  const [displayName, setDisplayName] = useState("My Phone");
  const [device, setDevice] = useState(DEVICE_PROFILES[0]);
  const [image, setImage] = useState<SystemImage | undefined>(
    sdk.images.find((i) => i.playStore) ?? sdk.images[0],
  );
  const [ramMb, setRamMb] = useState<number>(2048);
  const [dataSizeGb, setDataSizeGb] = useState<number>(8);
  const [cores, setCores] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = sanitizeAvdName(displayName);
  const spec: AvdSpec | null = image
    ? { name, displayName: displayName.trim() || name, device, image, ramMb, dataSizeGb, cores }
    : null;
  const errors = spec ? validateSpec(spec, sdk.avds) : ["No system image installed."];

  const build = async () => {
    if (!spec || errors.length || !sdk.sdkPath) return;
    setBusy(true);
    setError(null);
    try {
      await invoke<string>("create_avd", {
        name: spec.name,
        avdIni: buildAvdIni(spec, sdk.avdHome),
        configIni: buildConfigIni(spec, sdk.sdkPath),
      });
      onBuilt(spec.name);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setBusy(false);
    }
  };

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-[11px] text-bee-textMuted">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );

  const chip = (active: boolean) =>
    `rounded-md border px-2 py-1 text-[11px] transition-colors ${
      active
        ? "border-bee-gold/50 bg-bee-gold/15 text-bee-goldHi"
        : "border-bee-border/60 text-bee-textDim hover:border-bee-gold/30 hover:text-bee-text"
    }`;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-bee-border/60 bg-bee-surface shadow-2xl">
        <div className="flex items-center gap-2 border-b border-bee-border/40 px-3 py-2.5">
          <Smartphone className="size-3.5 text-bee-gold" />
          <span className="text-xs font-semibold text-bee-text">Build an emulator</span>
          <button
            onClick={onClose}
            className="ml-auto rounded p-0.5 text-bee-textMuted transition-colors hover:bg-bee-border/40 hover:text-bee-text"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="space-y-3 p-3">
          <Row label="Name">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border border-bee-border/50 bg-bee-canvas/60 px-2 py-1 text-[11px] text-bee-text outline-none focus:border-bee-gold/40"
            />
            {name && name !== displayName.trim() && (
              <span className="mt-0.5 block text-[9px] text-bee-textMuted">id: {name}</span>
            )}
          </Row>

          <Row label="Device">
            <div className="flex flex-wrap gap-1">
              {DEVICE_PROFILES.map((d) => (
                <button key={d.id} onClick={() => setDevice(d)} className={chip(device.id === d.id)}>
                  {d.name}
                </button>
              ))}
            </div>
            <span className="mt-1 block text-[9px] text-bee-textMuted">
              {device.width}×{device.height} · {device.density} dpi
            </span>
          </Row>

          <Row label="System image">
            {sdk.images.length === 0 ? (
              <span className="text-[10px] text-bee-err">
                No system images installed. Add one in Android Studio → SDK Manager.
              </span>
            ) : (
              <div className="flex flex-col gap-1">
                {sdk.images.map((i) => (
                  <button
                    key={`${i.apiDir}/${i.tagDir}/${i.abi}`}
                    onClick={() => setImage(i)}
                    className={`${chip(
                      image?.apiDir === i.apiDir && image?.tagDir === i.tagDir && image?.abi === i.abi,
                    )} text-left`}
                  >
                    {i.label}
                    {i.playStore && (
                      <span className="ml-1 rounded bg-bee-gold/15 px-1 text-[8px] text-bee-gold">
                        Play Store
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Row>

          <Row label="RAM">
            <div className="flex gap-1">
              {RAM_CHOICES.map((r) => (
                <button key={r} onClick={() => setRamMb(r)} className={chip(ramMb === r)}>
                  {r >= 1024 ? `${r / 1024} GB` : `${r} MB`}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Storage">
            <div className="flex gap-1">
              {STORAGE_CHOICES.map((s) => (
                <button key={s} onClick={() => setDataSizeGb(s)} className={chip(dataSizeGb === s)}>
                  {s} GB
                </button>
              ))}
            </div>
          </Row>

          <Row label="CPU cores">
            <div className="flex gap-1">
              {[2, 4, 6, 8].map((c) => (
                <button key={c} onClick={() => setCores(c)} className={chip(cores === c)}>
                  {c}
                </button>
              ))}
            </div>
          </Row>

          <div className="flex items-start gap-1.5 rounded-md border border-bee-border/40 bg-bee-canvas/40 px-2 py-1.5">
            <Lock className="mt-px size-3 shrink-0 text-bee-gold" />
            <span className="text-[9px] leading-[1.5] text-bee-textMuted">
              Hardware is permanent once built — like a real device. To change RAM,
              storage or screen you build a new emulator.
            </span>
          </div>

          {(errors.length > 0 || error) && (
            <div className="flex items-start gap-1.5 text-[10px] text-bee-err">
              <AlertTriangle className="mt-px size-3 shrink-0" />
              <span>{error ?? errors[0]}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-bee-border/40 px-3 py-2">
          <button
            onClick={onClose}
            className="rounded-md px-2.5 py-1 text-[11px] text-bee-textDim transition-colors hover:text-bee-text"
          >
            Cancel
          </button>
          <button
            onClick={build}
            disabled={busy || errors.length > 0 || !sdk.sdkPath}
            className="rounded-md border border-bee-gold/25 bg-bee-gold/10 px-2.5 py-1 text-[11px] font-medium text-bee-goldHi transition-colors hover:bg-bee-gold/20 disabled:opacity-40"
          >
            {busy ? "Building…" : "Build emulator"}
          </button>
        </div>
      </div>
    </div>
  );
}
