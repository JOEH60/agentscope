/**
 * AgentScope 会话管理
 */

import { v4 as uuidv4 } from 'uuid';
import type { Session, SessionStatus, AgentEvent } from './types.js';
import { globalEventBus, EventBus } from './event.js';

/** 会话管理器 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private currentSession: Session | null = null;
  private eventBus: EventBus;

  constructor() {
    this.eventBus = globalEventBus;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.onAll((event: AgentEvent) => {
      if (this.currentSession && event.sessionId === this.currentSession.id) {
        this.currentSession.eventCount++;
      }
    });
  }

  /** 创建新会话 */
  createSession(options: {
    agentName: string;
    model: string;
    name?: string;
    metadata?: Record<string, unknown>;
  }): Session {
    const session: Session = {
      id: uuidv4(),
      name: options.name || `session-${Date.now()}`,
      status: 'running' as SessionStatus.RUNNING,
      agentName: options.agentName,
      model: options.model,
      startTime: Date.now(),
      eventCount: 0,
      totalTokens: 0,
      totalDuration: 0,
      metadata: options.metadata,
    };

    this.sessions.set(session.id, session);
    this.currentSession = session;

    return session;
  }

  /** 获取会话 */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /** 获取当前会话 */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /** 更新会话状态 */
  updateStatus(sessionId: string, status: SessionStatus): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      if (status === 'completed' || status === 'failed') {
        session.endTime = Date.now();
        session.totalDuration = session.endTime - session.startTime;
      }
    }
  }

  /** 更新 Token 使用量 */
  updateTokens(sessionId: string, tokens: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.totalTokens += tokens;
    }
  }

  /** 获取所有会话 */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /** 删除会话 */
  deleteSession(sessionId: string): boolean {
    if (this.currentSession?.id === sessionId) {
      this.currentSession = null;
    }
    return this.sessions.delete(sessionId);
  }

  /** 清空所有会话 */
  clearAll(): void {
    this.sessions.clear();
    this.currentSession = null;
  }
}

/** 全局会话管理器实例 */
export const globalSessionManager = new SessionManager();
