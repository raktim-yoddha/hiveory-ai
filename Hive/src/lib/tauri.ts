// Tauri API wrapper - only available in Tauri environment
// This file handles conditional loading of Tauri APIs to avoid SSR issues

export interface TauriAPIs {
  invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
  open: (options?: Record<string, unknown>) => Promise<unknown>;
  save: (options?: Record<string, unknown>) => Promise<string | null>;
  getCurrentWindow: () => any;
}

// Stub functions for SSR
const stubInvoke = async <T>(): Promise<T> => {
  return Promise.reject(new Error('Tauri APIs not available'));
};
const stubOpen = async (): Promise<unknown> => null;
const stubSave = async (): Promise<string | null> => null;
const stubGetCurrentWindow = () => null;

const stubAPIs: TauriAPIs = {
  invoke: stubInvoke,
  open: stubOpen,
  save: stubSave,
  getCurrentWindow: stubGetCurrentWindow,
};

let cachedAPIs: TauriAPIs | null = null;
let isLoading = false;

export const getTauriAPIs = (): TauriAPIs => {
  // Return cached APIs if available
  if (cachedAPIs) return cachedAPIs;

  // Return stubs if not in browser or still loading
  if (typeof window === 'undefined' || isLoading) {
    return stubAPIs;
  }

  // Start loading real APIs asynchronously
  loadTauriAPIs();

  // Return stubs for now, will be replaced once loaded
  return stubAPIs;
};

// Function to load real Tauri APIs dynamically
export const loadTauriAPIs = async (): Promise<TauriAPIs | null> => {
  if (typeof window === 'undefined') return null;
  if (cachedAPIs) return cachedAPIs;
  if (isLoading) return null;

  isLoading = true;

  try {
    const tauriCore = await import('@tauri-apps/api/core');
    const tauriDialog = await import('@tauri-apps/plugin-dialog');
    const tauriWindow = await import('@tauri-apps/api/window');

    cachedAPIs = {
      invoke: tauriCore.invoke,
      open: tauriDialog.open as TauriAPIs['open'],
      save: tauriDialog.save,
      getCurrentWindow: tauriWindow.getCurrentWindow,
    };
    return cachedAPIs;
  } catch (e) {
    console.error('Failed to load Tauri APIs:', e);
    return null;
  } finally {
    isLoading = false;
  }
};
