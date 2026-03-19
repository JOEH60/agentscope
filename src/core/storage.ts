/**
 * AgentScope 数据存储
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { Session, AgentEvent, TraceRecord, AnalysisResult } from './types.js';

/** 存储管理器 */
export class StorageManager {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), 'agentscope.db');
  }

  /** 初始化数据库 */
  init(): void {
    // 确保目录存在
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);

    // 创建表
    this.createTables();
  }

  private createTables(): void {
    if (!this.db) return;

    // 会话表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT,
        status TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        model TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        event_count INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        total_duration INTEGER DEFAULT 0,
        metadata TEXT
      )
    `);

    // 事件表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        parent_id TEXT,
        data TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // 追踪表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS traces (
        session_id TEXT PRIMARY KEY,
        decision_tree TEXT NOT NULL,
        tool_calls TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // 分析结果表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS analysis (
        session_id TEXT PRIMARY KEY,
        metrics TEXT NOT NULL,
        bottlenecks TEXT NOT NULL,
        suggestions TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    `);
  }

  // ========== 会话操作 ==========

  saveSession(session: Session): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions
      (id, name, status, agent_name, model, start_time, end_time, event_count, total_tokens, total_duration, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session.id,
      session.name || null,
      session.status,
      session.agentName,
      session.model,
      session.startTime,
      session.endTime || null,
      session.eventCount,
      session.totalTokens,
      session.totalDuration,
      session.metadata ? JSON.stringify(session.metadata) : null
    );
  }

  getSession(sessionId: string): Session | undefined {
    if (!this.db) return undefined;

    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    const row = stmt.get(sessionId) as any;

    if (!row) return undefined;

    return this.rowToSession(row);
  }

  getAllSessions(): Session[] {
    if (!this.db) return [];

    const stmt = this.db.prepare('SELECT * FROM sessions ORDER BY start_time DESC');
    const rows = stmt.all() as any[];

    return rows.map(this.rowToSession);
  }

  deleteSession(sessionId: string): void {
    if (!this.db) return;

    // 删除相关数据
    this.db.prepare('DELETE FROM events WHERE session_id = ?').run(sessionId);
    this.db.prepare('DELETE FROM traces WHERE session_id = ?').run(sessionId);
    this.db.prepare('DELETE FROM analysis WHERE session_id = ?').run(sessionId);
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }

  private rowToSession(row: any): Session {
    return {
      id: row.id,
      name: row.name || undefined,
      status: row.status,
      agentName: row.agent_name,
      model: row.model,
      startTime: row.start_time,
      endTime: row.end_time || undefined,
      eventCount: row.event_count,
      totalTokens: row.total_tokens,
      totalDuration: row.total_duration,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  // ========== 事件操作 ==========

  saveEvent(event: AgentEvent): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO events (id, session_id, type, timestamp, parent_id, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.id,
      event.sessionId,
      event.type,
      event.timestamp,
      event.parentId || null,
      JSON.stringify(event)
    );
  }

  getEvents(sessionId: string): AgentEvent[] {
    if (!this.db) return [];

    const stmt = this.db.prepare('SELECT data FROM events WHERE session_id = ? ORDER BY timestamp');
    const rows = stmt.all(sessionId) as any[];

    return rows.map(row => JSON.parse(row.data));
  }

  // ========== 追踪操作 ==========

  saveTrace(trace: TraceRecord): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO traces (session_id, decision_tree, tool_calls, start_time, end_time)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      trace.sessionId,
      JSON.stringify(trace.decisionTree),
      JSON.stringify(trace.toolCalls),
      trace.startTime,
      trace.endTime || null
    );
  }

  getTrace(sessionId: string): TraceRecord | undefined {
    if (!this.db) return undefined;

    const stmt = this.db.prepare('SELECT * FROM traces WHERE session_id = ?');
    const row = stmt.get(sessionId) as any;

    if (!row) return undefined;

    return {
      sessionId: row.session_id,
      decisionTree: JSON.parse(row.decision_tree),
      toolCalls: JSON.parse(row.tool_calls),
      startTime: row.start_time,
      endTime: row.end_time || undefined,
    };
  }

  // ========== 分析结果操作 ==========

  saveAnalysis(result: AnalysisResult): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO analysis (session_id, metrics, bottlenecks, suggestions, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      result.sessionId,
      JSON.stringify(result.metrics),
      JSON.stringify(result.bottlenecks),
      JSON.stringify(result.suggestions),
      Date.now()
    );
  }

  getAnalysis(sessionId: string): AnalysisResult | undefined {
    if (!this.db) return undefined;

    const stmt = this.db.prepare('SELECT * FROM analysis WHERE session_id = ?');
    const row = stmt.get(sessionId) as any;

    if (!row) return undefined;

    return {
      sessionId: row.session_id,
      metrics: JSON.parse(row.metrics),
      bottlenecks: JSON.parse(row.bottlenecks),
      suggestions: JSON.parse(row.suggestions),
    };
  }

  /** 关闭数据库连接 */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/** 全局存储管理器实例 */
export const globalStorage = new StorageManager();
