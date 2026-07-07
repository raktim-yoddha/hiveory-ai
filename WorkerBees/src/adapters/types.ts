import { ChildProcess } from 'child_process';
import { InjectionResult } from '@hiveory/nectar';

export interface AdapterConfig {
  projectPath: string;
  agentPath?: string;
  apiKey?: string;
  model?: string;
}

export interface LaunchContext {
  paneId: string;
  task: string;
  openFiles: string[];
  gitDiff?: string;
  nectarContext: InjectionResult;
}

export interface SessionSummary {
  agentType: string;
  sessionId: string;
  changes: string[];
  decisions: Array<{
    type: 'architecture' | 'convention' | 'bug_fix' | 'general';
    description: string;
  }>;
  timestamp: number;
}

export interface WorkerBeeAdapter {
  readonly name: string;
  readonly type: 'claude' | 'codex' | 'aider' | 'gemini';

  launch(context: LaunchContext): Promise<ChildProcess>;
  onOutput(data: string): void;
  onSessionEnd(summary: SessionSummary): Promise<void>;
  formatContext(context: InjectionResult): string;
}
