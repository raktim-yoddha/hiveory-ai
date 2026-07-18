import { create } from "zustand";
import type { WorkerBee } from "@/features/worker-bees/workerBeesStore";

/**
 * A "plane" is the single kind of surface the center shows at a time. Instead of
 * mixing agents, terminals, browsers and emulators in one grid, each plane holds
 * only its own kind — you switch planes from the title bar, and add items with
 * the plane's own `+`.
 */
export type PlaneKind = "workerbees" | "terminal" | "browser" | "coworkers" | "emulator";

/** The `WorkerBee.kind` a plane contains. `undefined` = a CLI agent. */
export type PaneKind = WorkerBee["kind"];

export interface PlaneDef {
  kind: PlaneKind;
  label: string;
  /** The pane kind this plane filters to. `agent` maps to undefined kind. */
  paneKind: NonNullable<PaneKind> | "agent";
  /** Distinct accent per section (point 4). */
  accent: string;
  /** Softer fill used behind the plane header. */
  accentSoft: string;
}

export const PLANES: PlaneDef[] = [
  { kind: "workerbees", label: "WorkerBees", paneKind: "agent",    accent: "#c9a227", accentSoft: "rgba(201,162,39,0.12)" },
  { kind: "terminal",   label: "Terminal",   paneKind: "shell",    accent: "#22c55e", accentSoft: "rgba(34,197,94,0.12)" },
  { kind: "browser",    label: "Browser",    paneKind: "browser",  accent: "#3b82f6", accentSoft: "rgba(59,130,246,0.12)" },
  { kind: "coworkers",  label: "CoWorkers",  paneKind: "coworker", accent: "#a855f7", accentSoft: "rgba(168,85,247,0.12)" },
  { kind: "emulator",   label: "Emulator",   paneKind: "emulator", accent: "#06b6d4", accentSoft: "rgba(6,182,212,0.12)" },
];

export function planeFor(kind: PlaneKind): PlaneDef {
  return PLANES.find((p) => p.kind === kind) ?? PLANES[0];
}

/** Does a pane belong to this plane? (agent plane owns kind `undefined`). */
export function paneInPlane(bee: WorkerBee, plane: PlaneDef): boolean {
  const k = bee.kind ?? "agent";
  return k === plane.paneKind;
}

interface PlaneState {
  active: PlaneKind;
  /** Plane fills the whole window, over the title/status bars, until restored. */
  fullscreen: boolean;
  setActive: (k: PlaneKind) => void;
  setFullscreen: (v: boolean) => void;
  toggleFullscreen: () => void;
}

export const usePlaneStore = create<PlaneState>((set) => ({
  active: "workerbees",
  fullscreen: false,
  setActive: (active) => set({ active }),
  setFullscreen: (fullscreen) => set({ fullscreen }),
  toggleFullscreen: () => set((s) => ({ fullscreen: !s.fullscreen })),
}));
