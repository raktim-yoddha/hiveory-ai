import { NectarDatabase } from './db';
import { MemoryManager } from './memory';
import { SearchEngine } from './search';
import { InjectionPipeline, InjectionConfig, InjectionContext } from './injection';

export class Nectar {
  private db: NectarDatabase;
  private memoryManager: MemoryManager;
  private searchEngine: SearchEngine;
  private injectionPipeline: InjectionPipeline;

  constructor(projectPath: string) {
    this.db = new NectarDatabase(projectPath);
    this.memoryManager = new MemoryManager(this.db, projectPath);
    this.searchEngine = new SearchEngine(this.db);
    this.injectionPipeline = new InjectionPipeline(this.searchEngine, this.memoryManager);
  }

  async initialize(): Promise<void> {
    await this.memoryManager.ensureStructure();
  }

  // Memory operations
  getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }

  // Search operations
  async search(query: string, options?: { limit?: number; minScore?: number }) {
    return this.searchEngine.hybridSearch(query, options);
  }

  // Injection operations
  async inject(context: InjectionContext, config?: InjectionConfig) {
    const pipeline = config 
      ? new InjectionPipeline(this.searchEngine, this.memoryManager, config)
      : this.injectionPipeline;
    return pipeline.inject(context);
  }

  // Index a memory file
  async indexFile(relativePath: string): Promise<void> {
    const memoryFile = await this.memoryManager.readMemoryFile(relativePath);
    if (!memoryFile) return;

    const chunks = await this.memoryManager.parseMarkdownToChunks(memoryFile.content);
    const db = this.db.getDatabase();

    // Delete existing chunks for this file
    db.prepare('DELETE FROM chunks WHERE source_file = ?').run(relativePath);

    // Insert new chunks
    const insert = db.prepare(`
      INSERT INTO chunks (id, source_file, chunk_index, content, embedding, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.searchEngine['embedText'](chunk.text);
      const embeddingBuffer = new Float32Array(embedding).buffer;
      
      insert.run(
        `${relativePath}:${i}:${now}`,
        relativePath,
        i,
        chunk.text,
        new Uint8Array(embeddingBuffer),
        now,
        now
      );
    }

    // Update or insert memory file record
    db.prepare(`
      INSERT OR REPLACE INTO memory_files (id, path, type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      relativePath,
      relativePath,
      memoryFile.type,
      now,
      now
    );
  }

  // Re-index all memory files
  async reindexAll(): Promise<void> {
    const memoryFiles = await this.memoryManager.listMemoryFiles();
    for (const file of memoryFiles) {
      await this.indexFile(file);
    }
  }

  close(): void {
    this.db.close();
  }
}

export * from './db';
export * from './memory';
export * from './search';
export * from './injection';
