import Database from 'better-sqlite3';
import path from 'path';
import { initializeSchema, getSchemaVersion, setSchemaVersion } from './schema';

const CURRENT_SCHEMA_VERSION = 1;

export class NectarDatabase {
  private db: Database.Database;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    const dbPath = path.join(projectPath, '.nectar', 'nectar.db');
    this.db = new Database(dbPath);
    
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    
    this.migrate();
  }

  private migrate(): void {
    const version = getSchemaVersion(this.db);
    
    if (version === 0) {
      initializeSchema(this.db);
      setSchemaVersion(this.db, CURRENT_SCHEMA_VERSION);
    }
    // Future migrations would go here
  }

  getDatabase(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }

  // Transaction helper
  transaction<T>(fn: (db: Database.Database) => T): T {
    const tx = this.db.transaction(fn);
    return tx(this.db);
  }
}
