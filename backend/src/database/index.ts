import { DatabaseAdapter } from '../types';
import { SQLiteAdapter } from './sqlite-adapter';

let dbInstance: DatabaseAdapter | null = null;

export function getDatabase(): DatabaseAdapter {
  if (!dbInstance) {
    const dbType = process.env.DB_TYPE || 'sqlite';
    
    if (dbType === 'sqlite') {
      const dbPath = process.env.SQLITE_DB_PATH || './data/ai-usage-tracking.db';
      dbInstance = new SQLiteAdapter(dbPath);
      console.log(`✅ Connected to SQLite database at ${dbPath}`);
    } else if (dbType === 'cosmosdb') {
      // TODO: Implement Cosmos DB adapter later
      throw new Error('Cosmos DB adapter not yet implemented. Use sqlite for local development.');
    } else {
      throw new Error(`Unknown database type: ${dbType}`);
    }
  }
  
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}
