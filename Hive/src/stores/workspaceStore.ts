import { create } from 'zustand';
import type { WorkerBee } from './workerBeesStore';
import type { TaskCard } from '@hiveory/taskcomb';

export type { TaskCard } from '@hiveory/taskcomb';
export type { ColumnId, ColumnDefinition } from '@hiveory/taskcomb';
export { DEFAULT_COLUMNS } from '@hiveory/taskcomb';

export interface Workspace {
  id: string;
  name: string;
  color: string;
  boundProjectPath: string;
  paneLayout: WorkerBee[];
  taskCards: TaskCard[];
  nextSortOrder: number;
  activeMissionId?: string;
  isDeleting?: boolean;
  deletePhase?: 'queued' | 'deleting';
}

export type DeleteState = { isDeleting: boolean; phase: 'queued' | 'deleting' };

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  boardOpen: boolean;
  renamingWorkspaceId: string | null;

  addWorkspace: (workspace: Workspace) => void;
  removeWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  renameWorkspace: (id: string, name: string) => void;
  setWorkspaceColor: (id: string, color: string) => void;
  getActiveWorkspace: () => Workspace | undefined;
  setBoardOpen: (open: boolean) => void;
  setRenamingWorkspaceId: (id: string | null) => void;

  addTask: (workspaceId: string, title: string, description?: string) => void;
  setTasks: (workspaceId: string, tasks: TaskCard[]) => void;
  moveTask: (workspaceId: string, taskId: string, targetColumn: import('@hiveory/taskcomb').ColumnId, targetIndex?: number) => void;
  activateWorkspaceAndSync: (id: string) => void;

  deleteWorkspace: (id: string) => void;
  commitDeleteWorkspace: (id: string) => void;
  cancelDeleteWorkspace: (id: string) => void;
}

const WORKSPACE_COLORS = ['#c9a227', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#06b6d4'];

let wsSeq = 0;
function nextWsId() { return `ws-${Date.now()}-${wsSeq++}`; }

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [{
    id: nextWsId(),
    name: 'Default',
    color: WORKSPACE_COLORS[0],
    boundProjectPath: '',
    paneLayout: [],
    taskCards: [],
    nextSortOrder: 0,
  }],
  activeWorkspaceId: '',
  boardOpen: false,
  renamingWorkspaceId: null,

  addWorkspace: (workspace) =>
    set((state) => ({ workspaces: [...state.workspaces, workspace], activeWorkspaceId: workspace.id })),

  removeWorkspace: (id) =>
    set((state) => {
      const remaining = state.workspaces.filter((w) => w.id !== id);
      if (remaining.length === 0) return state;
      return { workspaces: remaining, activeWorkspaceId: state.activeWorkspaceId === id ? remaining[0].id : state.activeWorkspaceId };
    }),

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
  setBoardOpen: (open) => set({ boardOpen: open }),
  setRenamingWorkspaceId: (id) => set({ renamingWorkspaceId: id }),

  updateWorkspace: (id, updates) =>
    set((state) => ({ workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, ...updates } : w)) })),

  renameWorkspace: (id, name) =>
    set((state) => ({ workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, name } : w)) })),

  setWorkspaceColor: (id, color) =>
    set((state) => ({ workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, color } : w)) })),

  getActiveWorkspace: () => get().workspaces.find((w) => w.id === get().activeWorkspaceId),

  addTask: (workspaceId, title, description) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) => {
        if (w.id !== workspaceId) return w;
        const newCard: TaskCard = {
          id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title, description: description ?? '', column: 'backlog', sortOrder: w.nextSortOrder,
          owns: [], reads: [], dependsOn: [], createdAt: Date.now(), updatedAt: Date.now(),
        };
        return { ...w, taskCards: [...w.taskCards, newCard], nextSortOrder: w.nextSortOrder + 1 };
      }),
    })),

  setTasks: (workspaceId, tasks) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) => (w.id === workspaceId ? { ...w, taskCards: tasks } : w)),
    })),

  moveTask: (workspaceId, taskId, targetColumn, targetIndex) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) => {
        if (w.id !== workspaceId) return w;
        const cards = w.taskCards.filter((c) => c.id !== taskId);
        const moved = w.taskCards.find((c) => c.id === taskId);
        if (!moved) return w;
        const updated = { ...moved, column: targetColumn, sortOrder: targetIndex ?? cards.length, updatedAt: Date.now() };
        cards.splice(targetIndex !== undefined ? Math.min(targetIndex, cards.length) : cards.length, 0, updated);
        return { ...w, taskCards: cards };
      }),
    })),

  activateWorkspaceAndSync: (id) => { set({ activeWorkspaceId: id }); },

  deleteWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id ? { ...w, isDeleting: true, deletePhase: 'queued' as const } : w
      ),
    })),

  commitDeleteWorkspace: (id) =>
    set((state) => {
      const remaining = state.workspaces.filter((w) => w.id !== id);
      if (remaining.length === 0) return state;
      return {
        workspaces: remaining,
        activeWorkspaceId: state.activeWorkspaceId === id ? remaining[0].id : state.activeWorkspaceId,
      };
    }),

  cancelDeleteWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id ? { ...w, isDeleting: false, deletePhase: undefined } : w
      ),
    })),
}));
