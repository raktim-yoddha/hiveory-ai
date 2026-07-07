import { create } from 'zustand';

interface TerminalState {
  activePanes: string[];
  addPane: (paneId: string) => void;
  removePane: (paneId: string) => void;
  activeAgent: 'claude' | 'codex' | 'aider' | 'gemini' | null;
  setActiveAgent: (agent: 'claude' | 'codex' | 'aider' | 'gemini' | null) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  activePanes: [],
  addPane: (paneId) => set((state) => ({ activePanes: [...state.activePanes, paneId] })),
  removePane: (paneId) => set((state) => ({ activePanes: state.activePanes.filter((p) => p !== paneId) })),
  activeAgent: null,
  setActiveAgent: (agent) => set({ activeAgent: agent }),
}));
