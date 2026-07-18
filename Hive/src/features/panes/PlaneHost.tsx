"use client";

import { useEffect, useState } from "react";
import {
  Bot, Terminal as TerminalIcon, Globe, Users, Smartphone,
  Plus, Maximize2, Minimize2, ChevronDown,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import WorkerBeePane from "@/features/worker-bees/WorkerBeePane";
import TerminalPane from "@/features/terminal/TerminalPane";
import BrowserPane from "@/features/browser/BrowserPane";
import EmulatorPane from "@/features/emulator/EmulatorPane";
import QueenBeeChat from "@/features/queenbee/QueenBeeChat";
import { CLI_METADATA } from "@hiveory/worker-bees";
import { PipelineBoard, type TaskCard } from "@hiveory/taskcomb";
import { X, Columns3 } from "lucide-react";
import HiveoryLogo from "@/shared/HiveoryLogo";
import { useWorkerBeesStore, type WorkerBee } from "@/features/worker-bees/workerBeesStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import {
  usePlaneStore, PLANES, planeFor, paneInPlane, type PlaneKind, type PlaneDef,
} from "./planeStore";

const INTERACTIVE = "button, input, select, textarea, a, [contenteditable], [role='button']";

const PLANE_ICON: Record<PlaneKind, typeof Bot> = {
  workerbees: Bot,
  terminal: TerminalIcon,
  browser: Globe,
  coworkers: Users,
  emulator: Smartphone,
};

interface Props {
  workingDir?: string | null;
}

export default function PlaneHost({ workingDir }: Props) {
  const workerBees = useWorkerBeesStore((s) => s.workerBees);
  const addWorkerBee = useWorkerBeesStore((s) => s.addWorkerBee);
  const setAgentStatus = useWorkerBeesStore((s) => s.setAgentStatus);
  const replaceAll = useWorkerBeesStore((s) => s.replaceAll);
  const removeWorkerBee = useWorkerBeesStore((s) => s.removeWorkerBee);
  const updateWorkerBee = useWorkerBeesStore((s) => s.updateWorkerBee);
  const maximizedPane = useWorkerBeesStore((s) => s.maximizedPane);
  const setMaximizedPane = useWorkerBeesStore((s) => s.setMaximizedPane);
  const reorderWorkerBees = useWorkerBeesStore((s) => s.reorderWorkerBees);
  const refitTerminals = useWorkerBeesStore((s) => s.refitTerminals);
  const gridLayout = useWorkerBeesStore((s) => s.gridLayout);
  const agentStatuses = useWorkerBeesStore((s) => s.agentStatuses);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const updateWorkspace = useWorkspaceStore((s) => s.updateWorkspace);
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const active = usePlaneStore((s) => s.active);
  const setActive = usePlaneStore((s) => s.setActive);
  const fullscreen = usePlaneStore((s) => s.fullscreen);
  const toggleFullscreen = usePlaneStore((s) => s.toggleFullscreen);
  const plane = planeFor(active);

  const [editingBee, setEditingBee] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragArmed, setDragArmed] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [shells, setShells] = useState<{ id: string; label: string; command: string }[]>([]);

  /* ── workspace sync (unchanged) ─────────────────────────────── */
  useEffect(() => {
    if (activeWorkspace) replaceAll(activeWorkspace.paneLayout);
  }, [activeWorkspaceId, activeWorkspace?.paneLayout.length]);
  useEffect(() => {
    if (activeWorkspace && workerBees !== activeWorkspace.paneLayout) {
      updateWorkspace(activeWorkspace.id, { paneLayout: workerBees });
    }
  }, [workerBees]);
  useEffect(() => {
    const id = requestAnimationFrame(() => refitTerminals());
    return () => cancelAnimationFrame(id);
  }, [gridLayout, active, fullscreen]);

  useEffect(() => {
    invoke("detect_shells").then((s: any) => setShells(Array.isArray(s) ? s : [])).catch(() => {});
  }, []);

  // Shut down the shared CDP browser when no browser panes remain.
  const browserCount = workerBees.filter((b) => b.kind === "browser").length;
  useEffect(() => {
    if (browserCount === 0) invoke("stop_cdp_browser").catch(() => {});
  }, [browserCount]);

  /* ── plane items ────────────────────────────────────────────── */
  const items = workerBees.filter((b) => paneInPlane(b, plane));

  /* ── adds (into the active plane) ───────────────────────────── */
  const persist = (bee: WorkerBee) => {
    if (activeWorkspaceId) {
      const ws = workspaces.find((w) => w.id === activeWorkspaceId);
      if (ws) updateWorkspace(activeWorkspaceId, { paneLayout: [...ws.paneLayout, bee] });
    }
  };
  const addAgent = (cli: string, name: string) => {
    const bee: WorkerBee = { id: `bee-${Date.now()}`, cli, cliName: name };
    addWorkerBee(bee); setAgentStatus(bee.id, "launching"); persist(bee);
  };
  const addShell = (shell?: { label: string; command: string }) => {
    const bee: WorkerBee = {
      id: `terminal-${Date.now()}`, cli: shell?.command ?? "shell",
      cliName: shell?.label ?? "Terminal", kind: "shell",
    };
    addWorkerBee(bee); persist(bee);
  };
  const addBrowser = () => {
    const bee: WorkerBee = { id: `browser-${Date.now()}`, cli: "browser", cliName: "Browser", kind: "browser" };
    addWorkerBee(bee); persist(bee);
  };
  const addEmulator = () => {
    const bee: WorkerBee = { id: `emulator-${Date.now()}`, cli: "emulator", cliName: "Emulator", kind: "emulator" };
    addWorkerBee(bee); persist(bee);
  };

  const handleRemove = (id: string) => {
    invoke("kill_terminal", { paneId: id }).finally(() => removeWorkerBee(id));
  };
  const toggleMaximize = (id: string) => {
    setMaximizedPane(maximizedPane === id ? null : id);
    requestAnimationFrame(() => refitTerminals());
  };
  const startRename = (id: string) => {
    const bee = workerBees.find((b) => b.id === id);
    if (bee) { setEditingBee(id); setEditValue(bee.customName || bee.cliName); }
  };
  const saveRename = () => {
    if (editingBee) { updateWorkerBee(editingBee, { customName: editValue }); setEditingBee(null); setEditValue(""); }
  };
  const cancelRename = () => { setEditingBee(null); setEditValue(""); };

  /* ── grid sizing (scoped to this plane's items) ─────────────── */
  const count = items.length;
  const colsFor = (): number => {
    if (count <= 1) return 1;
    switch (gridLayout) {
      case "rows": return 1;
      case "cols": return count;
      case "grid": return Math.ceil(Math.sqrt(count));
      case 1: case 2: case 3: case 4: return Math.min(gridLayout, count);
      default: return count <= 2 ? 2 : count <= 6 ? 3 : 4;
    }
  };
  const isMaster = gridLayout === "master" && !maximizedPane && count > 1;
  const cols = colsFor();
  const gridStyle = maximizedPane
    ? { gridTemplateColumns: "1fr", gridTemplateRows: "1fr", height: "100%" }
    : isMaster
    ? { gridTemplateColumns: "1.7fr 1fr", gridTemplateRows: `repeat(${count - 1}, minmax(180px, 1fr))`, gridAutoFlow: "row" as const }
    : { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: "minmax(240px, 1fr)" };

  const Icon = PLANE_ICON[active];

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-[100] flex flex-col bg-bee-canvas"
          : "flex-1 flex flex-col bg-bee-canvas/40 relative min-w-0"
      }
    >
      {/* ── Plane header — uniform theme chrome across every plane ────
          relative z-30: the panes use backdrop-blur (own stacking contexts) and
          come later in the DOM, so without this the add dropdown paints *behind*
          them. */}
      <div className="relative z-30 flex h-9 shrink-0 items-center gap-2 border-b border-bee-border/50 glass-toolbar px-2.5">
        {/* Fullscreen covers the app title bar, so the mark moves here. */}
        {fullscreen && <HiveoryLogo size={20} className="shrink-0" />}
        <Icon className="size-3.5 shrink-0 text-bee-gold" />
        <span className="text-xs font-semibold text-bee-text">{plane.label}</span>
        <span className="text-[10px] text-bee-textMuted">{count > 0 ? `${count} open` : ""}</span>

        {/* Add (contextual to the plane) */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-0.5 rounded-md border border-bee-gold/25 bg-bee-gold/10 px-1.5 py-0.5 text-[10px] font-medium text-bee-goldHi transition-colors hover:bg-bee-gold/20"
            title={`Add to ${plane.label}`}
          >
            <Plus className="size-3" />
            {active === "workerbees" || active === "terminal" ? <ChevronDown className="size-2.5 opacity-70" /> : null}
          </button>
          {showAdd && (
            <PlaneAddMenu
              plane={plane}
              shells={shells}
              onAgent={(id, name) => { addAgent(id, name); setShowAdd(false); }}
              onShell={(s) => { addShell(s); setShowAdd(false); }}
              onBrowser={() => { addBrowser(); setShowAdd(false); }}
              onEmulator={() => { addEmulator(); setShowAdd(false); }}
              onClose={() => setShowAdd(false)}
            />
          )}
        </div>

        <div className="ml-auto">
          <button
            onClick={toggleFullscreen}
            className="rounded p-1 text-bee-textMuted transition-colors hover:bg-black/20 hover:text-bee-text"
            title={fullscreen ? "Restore" : "Maximize plane"}
          >
            {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Plane body ───────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 p-2 overflow-auto scrollbar-sleek"
        onWheel={(e) => {
          if (!e.shiftKey) return;
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) el.scrollTop += e.deltaY;
          else if (el.scrollWidth > el.clientWidth) el.scrollLeft += e.deltaY;
        }}
      >
        {active === "coworkers" ? (
          <CoworkerPlaceholder accent="#c9a227" />
        ) : count === 0 ? (
          <PlaneEmpty plane={plane} onAdd={() => setShowAdd(true)} />
        ) : (
          <div className="grid gap-2 min-h-full" style={gridStyle}>
            {items.map((bee) => {
              const globalIndex = workerBees.indexOf(bee);
              const isThisMax = maximizedPane === bee.id;
              const shouldHide = maximizedPane !== null && !isThisMax;
              return (
                <div
                  key={bee.id}
                  draggable={dragArmed === bee.id && !isThisMax}
                  onMouseDown={(e) => {
                    const t = e.target as HTMLElement;
                    if (t.closest(INTERACTIVE)) return;
                    if (t.closest("[data-pane-drag]")) setDragArmed(bee.id);
                  }}
                  onMouseUp={() => setDragArmed(null)}
                  onDragStart={(e) => {
                    const t = e.target as HTMLElement;
                    if (t.closest(INTERACTIVE) || !t.closest("[data-pane-drag]")) { e.preventDefault(); return; }
                    setDraggedId(bee.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => { setDraggedId(null); setDragOverId(null); setDragArmed(null); }}
                  onDragOver={(e) => { e.preventDefault(); if (draggedId && draggedId !== bee.id) setDragOverId(bee.id); }}
                  onDrop={() => {
                    if (draggedId && draggedId !== bee.id) {
                      reorderWorkerBees(workerBees.findIndex((b) => b.id === draggedId), globalIndex);
                    }
                    setDraggedId(null); setDragOverId(null);
                  }}
                  className={`flex flex-col overflow-hidden glass shadow-glass hover:shadow-glass-lg ${
                    isThisMax
                      ? "fixed left-0 right-0 top-11 bottom-6 z-50 rounded-none shadow-2xl shadow-black/60"
                      : shouldHide
                      ? "hidden"
                      : "relative h-full rounded-xl border-t-2 transition-all duration-300"
                  } ${draggedId === bee.id ? "opacity-30 scale-[0.98]" : ""}`}
                  style={!isThisMax && !shouldHide ? {
                    // Uniform gold across every pane kind (WorkerBees look);
                    // brighter while a drop is hovering.
                    borderTopColor: dragOverId === bee.id ? "#c9a227" : "#c9a22755",
                  } : undefined}
                >
                  {bee.kind === "emulator" ? (
                    <EmulatorPane onClose={() => handleRemove(bee.id)} onToggleMaximize={() => toggleMaximize(bee.id)} isMaximized={isThisMax} />
                  ) : bee.kind === "browser" ? (
                    <BrowserPane paneId={bee.id} initialUrl={bee.url} onClose={() => handleRemove(bee.id)} onToggleMaximize={() => toggleMaximize(bee.id)} isMaximized={isThisMax} />
                  ) : bee.kind === "shell" ? (
                    <TerminalPane
                      paneId={bee.id} workingDir={workingDir}
                      tabName={bee.customName || bee.cliName}
                      shellCommand={bee.cli !== "shell" ? bee.cli : undefined}
                      shellLabel={bee.cliName}
                      onRename={editingBee === bee.id ? saveRename : () => startRename(bee.id)}
                      isEditing={editingBee === bee.id} editValue={editValue}
                      onEditChange={setEditValue} onCancelRename={cancelRename}
                      onClose={() => handleRemove(bee.id)} onToggleMaximize={() => toggleMaximize(bee.id)} isMaximized={isThisMax}
                    />
                  ) : (
                    <WorkerBeePane
                      paneId={bee.id} workingDir={workingDir} workerBee={bee}
                      onRename={editingBee === bee.id ? saveRename : () => startRename(bee.id)}
                      isEditing={editingBee === bee.id} editValue={editValue}
                      onEditChange={setEditValue} onCancelRename={cancelRename}
                      onClose={() => handleRemove(bee.id)} onToggleMaximize={() => toggleMaximize(bee.id)} isMaximized={isThisMax}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen hides the docked Task Comb + QueenBee dock, so offer both as
          floating widgets: QueenBee bottom-right, Task Comb bottom-left. */}
      {fullscreen && (
        <FullscreenWidgets
          tasks={activeWorkspace?.taskCards ?? []}
          statuses={agentStatuses}
        />
      )}
    </div>
  );
}

/* ── plane switcher for the title bar ─────────────────────────── */
export function PlaneSwitcher() {
  const active = usePlaneStore((s) => s.active);
  const setActive = usePlaneStore((s) => s.setActive);
  const workerBees = useWorkerBeesStore((s) => s.workerBees);
  return (
    <div className="flex items-center gap-0.5 rounded-lg glass border-bee-border/70 p-0.5">
      {PLANES.map((p) => {
        const Icon = PLANE_ICON[p.kind];
        const n = workerBees.filter((b) => paneInPlane(b, p)).length;
        const isActive = active === p.kind;
        return (
          <button
            key={p.kind}
            onClick={() => setActive(p.kind)}
            title={p.label}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              isActive
                ? "bg-bee-gold/15 text-bee-goldHi"
                : "text-bee-textMuted hover:text-bee-text"
            }`}
          >
            <Icon className="size-3.5" />
            <span className="hidden md:inline">{p.label}</span>
            {n > 0 && (
              <span className="rounded-full bg-bee-gold/20 px-1 text-[9px] text-bee-gold">{n}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── add menu ─────────────────────────────────────────────────── */
function PlaneAddMenu({
  plane, shells, onAgent, onShell, onBrowser, onEmulator, onClose,
}: {
  plane: PlaneDef;
  shells: { id: string; label: string; command: string }[];
  onAgent: (id: string, name: string) => void;
  onShell: (s: { label: string; command: string }) => void;
  onBrowser: () => void;
  onEmulator: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-0 top-full z-50 mt-1 max-h-[70vh] min-w-52 overflow-y-auto scrollbar-sleek rounded-xl glass-hi p-1 animate-fade-in">
        {plane.kind === "workerbees" && (
          <>
            <MenuLabel accent="#c9a227">CLI agents</MenuLabel>
            {CLI_METADATA.map((c) => (
              // Spawn by the shell command ("claude"), not the slug id
              // ("claude-code") — WorkerBeePane runs bee.cli directly.
              <MenuItem key={c.id} onClick={() => onAgent(c.command, c.name)} accent="#c9a227"
                title={c.name} subtitle={c.command} />
            ))}
          </>
        )}
        {plane.kind === "terminal" && (
          <>
            <MenuLabel accent="#c9a227">Shells</MenuLabel>
            {shells.length === 0 ? (
              <div className="px-2.5 py-2 text-[11px] text-bee-textMuted">Detecting…</div>
            ) : shells.map((s) => (
              <MenuItem key={s.id} onClick={() => onShell(s)} accent="#c9a227" title={s.label} />
            ))}
          </>
        )}
        {plane.kind === "browser" && (
          <MenuItem onClick={onBrowser} accent="#c9a227" title="New browser pane" subtitle="localhost preview" />
        )}
        {plane.kind === "emulator" && (
          <MenuItem onClick={onEmulator} accent="#c9a227" title="New emulator pane" subtitle="Android AVDs" />
        )}
        {plane.kind === "coworkers" && (
          <div className="px-2.5 py-2 text-[10px] leading-[1.5] text-bee-textMuted">
            CoworkerBees isn't installed yet. It's a separate local package (like
            WorkerBees) — coming in a later step.
          </div>
        )}
      </div>
    </>
  );
}

function MenuLabel({ children, accent }: { children: React.ReactNode; accent: string }) {
  return <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: accent }}>{children}</div>;
}
function MenuItem({ onClick, accent, title, subtitle }: { onClick: () => void; accent: string; title: string; subtitle?: string }) {
  return (
    <button onClick={onClick} className="flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-bee-textDim transition-colors hover:bg-bee-border/50 hover:text-bee-text">
      <Plus className="mt-0.5 size-3 shrink-0" style={{ color: accent }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{title}</span>
        {subtitle && <span className="block truncate text-[9px] text-bee-textMuted">{subtitle}</span>}
      </span>
    </button>
  );
}

/* ── empty + placeholder states ───────────────────────────────── */
function PlaneEmpty({ plane, onAdd }: { plane: PlaneDef; onAdd: () => void }) {
  const Icon = PLANE_ICON[plane.kind];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center animate-fade-in">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-bee-gold/10">
        <Icon className="size-6 text-bee-gold" />
      </div>
      <div className="text-sm font-medium text-bee-textDim">No {plane.label.toLowerCase()} open</div>
      <button
        onClick={onAdd}
        className="rounded-lg border border-bee-gold/25 bg-bee-gold/10 px-3 py-1 text-[11px] font-medium text-bee-goldHi transition-colors hover:bg-bee-gold/20"
      >
        Add {plane.label}
      </button>
    </div>
  );
}

/* ── floating widgets shown when a plane is fullscreen ────────── */
function FullscreenWidgets({ tasks, statuses }: { tasks: TaskCard[]; statuses: Record<string, string> }) {
  const [open, setOpen] = useState<"none" | "queen" | "comb">("none");
  return (
    <>
      {/* Task Comb — bottom-left */}
      {open === "comb" && (
        <div className="fixed bottom-16 left-4 z-[120] flex h-[46vh] w-[min(560px,60vw)] flex-col overflow-hidden rounded-xl border border-bee-border/60 bg-bee-surface shadow-2xl shadow-black/60 animate-fade-in">
          <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-bee-border/40 glass-toolbar px-2.5">
            <Columns3 className="size-3 text-bee-gold" />
            <span className="text-[11px] font-semibold text-bee-text">Task Comb</span>
            <button onClick={() => setOpen("none")} className="ml-auto rounded p-0.5 text-bee-textMuted hover:bg-bee-border/40 hover:text-bee-text">
              <X className="size-3" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <PipelineBoard open tasks={tasks} statuses={statuses} onClose={() => setOpen("none")} />
          </div>
        </div>
      )}

      {/* QueenBee — bottom-right */}
      {open === "queen" && (
        <div className="fixed bottom-16 right-4 z-[120] flex h-[56vh] w-[min(400px,44vw)] flex-col overflow-hidden rounded-xl border border-bee-border/60 shadow-2xl shadow-black/60 animate-fade-in">
          <QueenBeeChat docked onToggleDock={() => setOpen("none")} />
        </div>
      )}

      {/* Corner toggles (always visible in fullscreen) */}
      <button
        onClick={() => setOpen((o) => (o === "comb" ? "none" : "comb"))}
        className={`fixed bottom-4 left-4 z-[121] flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-lg transition-colors ${
          open === "comb"
            ? "border-bee-gold/50 bg-bee-gold/20 text-bee-goldHi"
            : "border-bee-border/60 bg-bee-surface/90 text-bee-textDim hover:text-bee-text"
        }`}
        title="Task Comb"
      >
        <Columns3 className="size-3.5" />
        Task Comb
      </button>
      <button
        onClick={() => setOpen((o) => (o === "queen" ? "none" : "queen"))}
        className={`fixed bottom-4 right-4 z-[121] flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-lg transition-colors ${
          open === "queen"
            ? "border-bee-gold/50 bg-bee-gold/20 text-bee-goldHi"
            : "border-bee-border/60 bg-bee-surface/90 text-bee-textDim hover:text-bee-text"
        }`}
        title="Ask QueenBee"
      >
        <Bot className="size-3.5" />
        QueenBee
      </button>
    </>
  );
}

function CoworkerPlaceholder({ accent }: { accent: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl" style={{ background: `${accent}1f` }}>
        <Users className="size-6" style={{ color: accent }} />
      </div>
      <div className="text-sm font-medium text-bee-textDim">CoWorkers</div>
      <p className="max-w-[380px] text-[11px] leading-[1.6] text-bee-textMuted">
        A local-first assistant surface — project tracker, info & lead collector,
        compatible with your installed assistant runtimes. It lives in its own{" "}
        <code style={{ color: accent }}>CoworkerBees</code> package (like WorkerBees)
        and isn't wired in yet.
      </p>
    </div>
  );
}
