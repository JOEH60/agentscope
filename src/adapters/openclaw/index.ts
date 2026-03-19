/**
 * OpenClaw Adapter
 * 用于追踪 OpenClaw Agent 的运行
 */

import {
  globalEventBus,
  globalSessionManager,
  globalTraceManager,
  globalStorage,
  EventType,
  type Session,
  type AgentEvent,
} from '../../core/index.js';

/** OpenClaw 适配器配置 */
export interface OpenClawAdapterConfig {
  /** Gateway WebSocket URL */
  gatewayUrl?: string;
  /** 是否自动保存 */
  autoSave?: boolean;
  /** 会话名称 */
  sessionName?: string;
}

/** OpenClaw 适配器 */
export class OpenClawAdapter {
  private config: OpenClawAdapterConfig;
  private currentSession: Session | null = null;
  private isConnected: boolean = false;

  constructor(config: OpenClawAdapterConfig = {}) {
    this.config = {
      gatewayUrl: 'ws://127.0.0.1:18789',
      autoSave: true,
      ...config,
    };

    // 初始化存储
    globalStorage.init();
  }

  /** 开始追踪一个 OpenClaw 会话 */
  startTracking(options: {
    agentName: string;
    model: string;
    sessionName?: string;
  }): Session {
    // 创建会话
    this.currentSession = globalSessionManager.createSession({
      agentName: options.agentName,
      model: options.model,
      name: options.sessionName || this.config.sessionName,
    });

    // 开始追踪
    globalTraceManager.startTrace(this.currentSession.id);

    // 发射 Agent 启动事件
    globalEventBus.emit({
      type: EventType.AGENT_START,
      sessionId: this.currentSession.id,
      agentName: options.agentName,
      model: options.model,
    });

    return this.currentSession;
  }

  /** 记录用户消息 */
  recordUserMessage(content: string): void {
    if (!this.currentSession) return;

    globalEventBus.emit({
      type: EventType.MESSAGE_USER,
      sessionId: this.currentSession.id,
      content,
    });
  }

  /** 记录 Assistant 消息 */
  recordAssistantMessage(content: string, tokens?: number): void {
    if (!this.currentSession) return;

    globalEventBus.emit({
      type: EventType.MESSAGE_ASSISTANT,
      sessionId: this.currentSession.id,
      content,
      tokens,
    });

    if (tokens) {
      globalSessionManager.updateTokens(this.currentSession.id, tokens);
    }
  }

  /** 记录思考开始 */
  recordThinkingStart(content: string): string {
    if (!this.currentSession) return '';

    const event = globalEventBus.emit({
      type: EventType.THINKING_START,
      sessionId: this.currentSession.id,
      content,
    });

    return event.id;
  }

  /** 记录思考结束 */
  recordThinkingEnd(content: string, startEventId?: string): void {
    if (!this.currentSession) return;

    globalEventBus.emit({
      type: EventType.THINKING_END,
      sessionId: this.currentSession.id,
      content,
      parentId: startEventId,
    });
  }

  /** 记录工具调用开始 */
  recordToolCallStart(toolName: string, args: Record<string, unknown>): string {
    if (!this.currentSession) return '';

    const event = globalEventBus.emit({
      type: EventType.TOOL_CALL_START,
      sessionId: this.currentSession.id,
      toolName,
      args,
    });

    // 添加到追踪
    globalTraceManager.addToolCall(this.currentSession.id, {
      toolName,
      args,
      startTime: Date.now(),
      success: false,
    });

    return event.id;
  }

  /** 记录工具调用结束 */
  recordToolCallEnd(
    toolName: string,
    result: unknown,
    startEventId?: string,
    error?: string
  ): void {
    if (!this.currentSession) return;

    globalEventBus.emit({
      type: EventType.TOOL_CALL_END,
      sessionId: this.currentSession.id,
      toolName,
      args: {},
      result,
      error,
      parentId: startEventId,
    });
  }

  /** 记录 Token 使用量 */
  recordTokenUsage(input: number, output: number): void {
    if (!this.currentSession) return;

    globalEventBus.emit({
      type: EventType.TOKEN_USAGE,
      sessionId: this.currentSession.id,
      input,
      output,
      total: input + output,
    });

    globalSessionManager.updateTokens(this.currentSession.id, input + output);
  }

  /** 结束追踪 */
  endTracking(status: 'completed' | 'failed' = 'completed'): Session | null {
    if (!this.currentSession) return null;

    // 发射结束事件
    globalEventBus.emit({
      type: EventType.AGENT_END,
      sessionId: this.currentSession.id,
      metadata: { status },
    });

    // 更新状态
    globalSessionManager.updateStatus(
      this.currentSession.id,
      status === 'completed' ? 'completed' : 'failed'
    );

    // 结束追踪
    globalTraceManager.endTrace(this.currentSession.id);

    // 保存数据
    if (this.config.autoSave) {
      const session = globalSessionManager.getSession(this.currentSession.id);
      if (session) {
        globalStorage.saveSession(session);
      }

      const events = globalEventBus.getHistory(this.currentSession.id);
      events.forEach(event => globalStorage.saveEvent(event));

      const trace = globalTraceManager.getTrace(this.currentSession.id);
      if (trace) {
        globalStorage.saveTrace(trace);
      }
    }

    const session = this.currentSession;
    this.currentSession = null;

    return session;
  }

  /** 获取当前会话 */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /** 获取决策树 */
  getDecisionTree() {
    if (!this.currentSession) return null;
    return globalTraceManager.getDecisionTree(this.currentSession.id);
  }

  /** 获取工具调用记录 */
  getToolCalls() {
    if (!this.currentSession) return [];
    return globalTraceManager.getToolCalls(this.currentSession.id);
  }

  /** 连接到 OpenClaw Gateway (实时监控模式) */
  async connect(): Promise<void> {
    // TODO: 实现 WebSocket 连接到 OpenClaw Gateway
    // 自动接收和记录事件
    this.isConnected = true;
  }

  /** 断开连接 */
  disconnect(): void {
    this.isConnected = false;
  }
}

/** 创建 OpenClaw 适配器实例 */
export function createOpenClawAdapter(config?: OpenClawAdapterConfig): OpenClawAdapter {
  return new OpenClawAdapter(config);
}
