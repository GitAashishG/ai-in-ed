import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseAdapter, User, Interaction, Event } from '../types';

export class SQLiteAdapter implements DatabaseAdapter {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure the directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initializeTables();
  }

  private initializeTables() {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        requestCount INTEGER DEFAULT 0,
        maxRequests INTEGER DEFAULT 50,
        createdAt TEXT NOT NULL,
        lastActive TEXT NOT NULL
      )
    `);

    // Interactions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        type TEXT NOT NULL,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        model TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        conversationHistory TEXT NOT NULL,
        responseTime INTEGER NOT NULL,
        tokenCount INTEGER,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Events table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        eventType TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        data TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_interactions_userId ON interactions(userId);
      CREATE INDEX IF NOT EXISTS idx_interactions_sessionId ON interactions(sessionId);
      CREATE INDEX IF NOT EXISTS idx_events_userId ON events(userId);
      CREATE INDEX IF NOT EXISTS idx_events_sessionId ON events(sessionId);
    `);
  }

  async getUser(userId: string): Promise<User | null> {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(userId) as any;
    return row || null;
  }

  async createUser(userId: string): Promise<User> {
    const now = new Date().toISOString();
    const user: User = {
      id: userId,
      requestCount: 0,
      maxRequests: parseInt(process.env.MAX_REQUESTS_PER_USER || '50'),
      createdAt: now,
      lastActive: now
    };

    const stmt = this.db.prepare(`
      INSERT INTO users (id, requestCount, maxRequests, createdAt, lastActive)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(user.id, user.requestCount, user.maxRequests, user.createdAt, user.lastActive);
    return user;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    const stmt = this.db.prepare(`UPDATE users SET ${fields} WHERE id = ?`);
    stmt.run(...values, userId);
  }

  async incrementRequestCount(userId: string): Promise<number> {
    const now = new Date().toISOString();
    
    // Update request count and last active time
    const stmt = this.db.prepare(`
      UPDATE users 
      SET requestCount = requestCount + 1, lastActive = ?
      WHERE id = ?
    `);
    stmt.run(now, userId);

    // Get the updated count
    const user = await this.getUser(userId);
    return user?.requestCount || 0;
  }

  async createInteraction(interaction: Omit<Interaction, 'id'>): Promise<string> {
    const id = uuidv4();
    
    const stmt = this.db.prepare(`
      INSERT INTO interactions (
        id, userId, sessionId, type, prompt, response, model, 
        timestamp, conversationHistory, responseTime, tokenCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      interaction.userId,
      interaction.sessionId,
      interaction.type,
      interaction.prompt,
      interaction.response,
      interaction.model,
      interaction.timestamp,
      JSON.stringify(interaction.conversationHistory),
      interaction.metadata.responseTime,
      interaction.metadata.tokenCount || null
    );

    return id;
  }

  async createEvent(event: Omit<Event, 'id'>): Promise<string> {
    const id = uuidv4();
    
    const stmt = this.db.prepare(`
      INSERT INTO events (id, userId, sessionId, eventType, timestamp, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      event.userId,
      event.sessionId,
      event.eventType,
      event.timestamp,
      JSON.stringify(event.data)
    );

    return id;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
