import { spawn, ChildProcess } from 'child_process';
import { WorkerBeeAdapter, LaunchContext, SessionSummary } from './types';
import { Nectar } from '@hiveory/nectar';

export class ClaudeCodeAdapter implements WorkerBeeAdapter {
  readonly name = 'Claude Code';
  readonly type = 'claude' as const;

  constructor(private nectar: Nectar) {}

  launch(context: LaunchContext): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      const args = [];
      
      // Add context as a system message
      const contextText = this.formatContext(context.nectarContext);
      if (contextText) {
        // Claude Code accepts context via stdin or file
        // For now, we'll prepend it to the task
      }

      const process = spawn('claude', [...args, context.task], {
        cwd: context.paneId,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      process.on('error', reject);
      process.on('spawn', () => resolve(process));
    });
  }

  onOutput(data: string): void {
    // Handle Claude Code output
    console.log('[Claude Code]', data);
  }

  async onSessionEnd(summary: SessionSummary): Promise<void> {
    const memoryManager = this.nectar.getMemoryManager();
    
    // Write session summary
    const sessionContent = `# Claude Code Session\n\nTime: ${new Date(summary.timestamp).toISOString()}\n\n## Changes\n\n${summary.changes.map(c => `- ${c}`).join('\n')}\n\n## Decisions\n\n${summary.decisions.map(d => `- [${d.type}] ${d.description}`).join('\n')}\n`;
    
    await memoryManager.writeMemoryFile(
      `agents/sessions/${summary.sessionId}.md`,
      sessionContent,
      { agent: 'claude', timestamp: summary.timestamp }
    );

    // Route decisions to appropriate memory files
    for (const decision of summary.decisions) {
      const targetFile = this.getDecisionTarget(decision.type);
      const existing = await memoryManager.readMemoryFile(targetFile);
      const content = existing?.content || '';
      const newEntry = `\n## ${new Date(summary.timestamp).toISOString()}\n\n${decision.description}\n`;
      
      await memoryManager.writeMemoryFile(targetFile, content + newEntry);
    }
  }

  formatContext(context: import('@hiveory/nectar').InjectionResult): string {
    if (context.chunks.length === 0) return '';
    
    return `<context>\n${context.chunks
      .map((c, i) => `### Context ${i + 1} (score: ${c.score.toFixed(3)})\nSource: ${c.sourceFile}\n\n${c.content}`)
      .join('\n\n---\n\n')}\n</context>\n`;
  }

  private getDecisionTarget(type: SessionSummary['decisions'][0]['type']): string {
    switch (type) {
      case 'architecture':
        return 'memory/decisions.md';
      case 'convention':
        return 'memory/conventions.md';
      case 'bug_fix':
        return 'memory/bugs.md';
      default:
        return 'memory/knowledge.md';
    }
  }
}
