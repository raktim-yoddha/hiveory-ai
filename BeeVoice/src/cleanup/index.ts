import type { CleanupConfig } from '../types.js';

export interface CleanupService {
  clean(raw: string): Promise<string>;
}

export function createCleanupService(config: CleanupConfig): CleanupService {
  return {
    async clean(raw: string): Promise<string> {
      if (!config.enabled) return raw;
      return config.clean(raw);
    },
  };
}

export class NoopCleanupService implements CleanupService {
  async clean(raw: string): Promise<string> {
    return raw;
  }
}
