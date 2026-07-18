import type { HotkeyAction } from '../types.js';

export interface HotkeyService {
  register(action: HotkeyAction, callback: () => void): Promise<void>;
  unregister(action: HotkeyAction): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class HotkeyServiceStub implements HotkeyService {
  private registrations = new Map<HotkeyAction, () => void>();

  async register(action: HotkeyAction, callback: () => void): Promise<void> {
    this.registrations.set(action, callback);
  }

  async unregister(action: HotkeyAction): Promise<void> {
    this.registrations.delete(action);
  }

  async start(): Promise<void> { }

  async stop(): Promise<void> {
    this.registrations.clear();
  }
}
