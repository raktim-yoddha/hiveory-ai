import { ChildProcess } from 'child_process';
import { Nectar, InjectionContext } from '@hiveory/nectar';
import { WorkerBeeAdapter, LaunchContext, SessionSummary } from './adapters/types';
import { ClaudeCodeAdapter } from './adapters/claude-code';
import { CodexAdapter } from './adapters/codex';
import { AiderAdapter } from './adapters/aider';
import { GeminiAdapter } from './adapters/gemini';

export interface LaunchOptions {
  projectPath: string;
  paneId: string;
  task: string;
  agentType: 'claude' | 'codex' | 'aider' | 'gemini';
  openFiles?: string[];
  gitDiff?: string;
}

export class WorkerBeeLauncher {
  private nectar: Nectar;
  private activeProcesses: Map<string, { process: ChildProcess; adapter: WorkerBeeAdapter; sessionId: string }>;

  constructor(nectar: Nectar) {
    this.nectar = nectar;
    this.activeProcesses = new Map();
  }

  async launch(options: LaunchOptions): Promise<string> {
    const sessionId = `${options.agentType}-${Date.now()}`;
    
    // Get Nectar context
    const injectionContext: InjectionContext = {
      task: options.task,
      openFiles: options.openFiles || [],
      gitDiff: options.gitDiff,
    };
    
    const nectarContext = await this.nectar.inject(injectionContext);
    
    // Log injection
    const memoryManager = this.nectar.getMemoryManager();
    await memoryManager.writeMemoryFile(
      `agents/sessions/${sessionId}.md`,
      `# Session Started\n\nAgent: ${options.agentType}\nTask: ${options.task}\nInjection: ${nectarContext.chunks.length} chunks\n`,
      { agent: options.agentType, timestamp: Date.now() }
    );

    // Create adapter
    const adapter = this.createAdapter(options.agentType);
    
    // Launch context
    const launchContext: LaunchContext = {
      paneId: options.paneId,
      task: options.task,
      openFiles: options.openFiles || [],
      gitDiff: options.gitDiff,
      nectarContext,
    };

    // Launch process
    const process = await adapter.launch(launchContext);
    
    // Set up output handlers
    process.stdout?.on('data', (data) => {
      adapter.onOutput(data.toString());
    });
    
    process.stderr?.on('data', (data) => {
      adapter.onOutput(data.toString());
    });

    // Track process
    this.activeProcesses.set(sessionId, { process, adapter, sessionId });

    return sessionId;
  }

  async endSession(sessionId: string, summary: SessionSummary): Promise<void> {
    const session = this.activeProcesses.get(sessionId);
    if (!session) return;

    // Call adapter's session end handler
    await session.adapter.onSessionEnd(summary);
    
    // Kill process
    session.process.kill();
    
    // Remove from tracking
    this.activeProcesses.delete(sessionId);
  }

  private createAdapter(type: 'claude' | 'codex' | 'aider' | 'gemini'): WorkerBeeAdapter {
    switch (type) {
      case 'claude':
        return new ClaudeCodeAdapter(this.nectar);
      case 'codex':
        return new CodexAdapter(this.nectar);
      case 'aider':
        return new AiderAdapter(this.nectar);
      case 'gemini':
        return new GeminiAdapter(this.nectar);
    }
  }

  getActiveSessions(): string[] {
    return Array.from(this.activeProcesses.keys());
  }
}
