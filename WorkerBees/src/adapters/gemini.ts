import { spawn, ChildProcess } from 'child_process';
import { WorkerBeeAdapter, LaunchContext, SessionSummary } from './types';
import { Nectar } from '@hiveory/nectar';

export class GeminiAdapter implements WorkerBeeAdapter {
  readonly name = 'Gemini CLI';
  readonly type = 'gemini' as const;

  constructor(private nectar: Nectar) {}

  launch(context: LaunchContext): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      const args = [];
      
      const contextText = this.formatContext(context.nectarContext);
      if (contextText) {
        args.push('--context', contextText);
      }

      const process = spawn('gemini', [...args, context.task], {
        cwd: context.paneId,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      process.on('error', reject);
      process.on('spawn', () => resolve(process));
    });
  }

  onOutput(data: string): void {
    console.log('[Gemini]', data);
  }

  async onSessionEnd(summary: SessionSummary): Promise<void> {
    const memoryManager = this.nectar.getMemoryManager();
    
    const sessionContent = `# Gemini CLI Session\n\nTime: ${new Date(summary.timestamp).toISOString()}\n\n## Changes\n\n${summary.changes.map(c => `- ${c}`).join('\n')}\n\n## Decisions\n\n${summary.decisions.map(d => `- [${d.type}] ${d.description}`).join('\n')}\n`;
    
    await memoryManager.writeMemoryFile(
      `agents/sessions/${summary.sessionId}.md`,
      sessionContent,
      { agent: 'gemini', timestamp: summary.timestamp }
    );

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
    
    return `Context:\n${context.chunks
      .map((c, i) => `${i + 1}. ${c.sourceFile}: ${c.content.substring(0, 150)}...`)
      .join('\n')}\n`;
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
