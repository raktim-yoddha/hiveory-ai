"use client";

import { useState } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import AndroidEmulatorPane from "./android/AndroidEmulatorPane";

/**
 * Emulator pane. Routes to a platform surface — `android/` today; iOS would sit
 * beside it (macOS-only, so it stays a separate folder rather than a branch in
 * one giant component).
 */
export type EmulatorPlatform = "android";

const PLATFORMS: { id: EmulatorPlatform; label: string }[] = [
  { id: "android", label: "Android" },
];

interface Props {
  onClose: () => void;
  onToggleMaximize: () => void;
  isMaximized: boolean;
}

export default function EmulatorPane({ onClose, onToggleMaximize, isMaximized }: Props) {
  const [platform, setPlatform] = useState<EmulatorPlatform>("android");

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bee-canvas">
      {/* Platform switcher + window controls. Only one platform today, so this
          row stays minimal rather than pretending to be a tab bar. */}
      <div data-pane-drag className="flex h-6 shrink-0 cursor-grab items-center gap-1 border-b border-bee-gold/40 bg-gradient-to-r from-bee-gold/[0.18] to-bee-gold/[0.06] backdrop-blur-md px-1.5 active:cursor-grabbing">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide transition-colors ${
              platform === p.id
                ? "bg-bee-gold/15 text-bee-goldHi"
                : "text-bee-textMuted hover:text-bee-textDim"
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={onToggleMaximize}
            className="rounded p-0.5 text-bee-textMuted transition-colors hover:bg-bee-border/50 hover:text-bee-text"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="size-2.5" /> : <Maximize2 className="size-2.5" />}
          </button>
          <button
            onClick={onClose}
            className="rounded p-0.5 text-bee-textMuted transition-colors hover:bg-bee-err/70 hover:text-white"
            title="Close"
          >
            <X className="size-2.5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {platform === "android" && <AndroidEmulatorPane />}
      </div>
    </div>
  );
}
