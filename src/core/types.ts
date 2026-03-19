/**
 * AgentScope 核心类型定义
 */

// ========== 事件类型 ==========

/** 事件类型枚举 */
export enum EventType {
  // Agent 生命周期
  AGENT_START = 'agent_start',
  AGENT_END = 'agent_end',
  AGENT_ERROR = 'agent_error',

  // 思考/决策
  THINKING_START = 'thinking_start',
  THINKING_END = 'thinking_end',
  DECISION_MADE = 'decision_made',

  // 工具调用
  TOOL_CALL_START = 'tool_call_start',
  TOOL_CALL_END = 'tool_call_end',
  TOOL_CALL_ERROR = 'tool_call_error',

  // 消息
  MESSAGE_USER = 'message_user',
  MESSAGE_ASSISTANT = 'message_assistant',
  MESSAGE_SYSTEM = 'message_system',

  // Token 统计
  TOKEN_USAGE = 'token_usage',
}

/** 基础事件 */
export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: number;
  sessionId: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

/** Agent 启动事件 */
export interface AgentStartEvent extends BaseEvent {
  type: EventType.AGENT_START;
  agentName: string;
  model: string;
  config?: Record<string, unknown>;
}

/** 思考事件 */
export interface ThinkingEvent extends BaseEvent {
  type: EventType.THINKING_START | EventType.THINKING_END;
  content: string;
  duration?: number;
}

/** 工具调用事件 */
export interface ToolCallEvent extends BaseEvent {
  type: EventType.TOOL_CALL_START | EventType.TOOL_CALL_END;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  duration?: number;
  error?: string;
}

/** 消息事件 */
export interface MessageEvent extends BaseEvent {
  type: EventType.MESSAGE_USER | EventType.MESSAGE_ASSISTANT | EventType.MESSAGE_SYSTEM;
  content: string;
  tokens?: number;
}

/** Token 使用事件 */
export interface TokenUsageEvent extends BaseEvent {
  type: EventType.TOKEN_USAGE;
  input: number;
  output: number;
  total: number;
}

/** 联合类型 */
export type AgentEvent =
  | AgentStartEvent
  | ThinkingEvent
  | ToolCallEvent
  | MessageEvent
  | TokenUsageEvent
  | BaseEvent;

// ========== 会话类型 ==========

/** 会话状态 */
export enum SessionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused',
}

/** 会话信息 */
export interface Session {
  id: string;
  name?: string;
  status: SessionStatus;
  agentName: string;
  model: string;
  startTime: number;
  endTime?: number;
  eventCount: number;
  totalTokens: number;
  totalDuration: number;
  metadata?: Record<string, unknown>;
}

// ========== 追踪类型 ==========

/** 决策树节点 */
export interface DecisionNode {
  id: string;
  type: 'thinking' | 'tool' | 'message' | 'decision';
  content: string;
  timestamp: number;
  duration?: number;
  children: DecisionNode[];
  metadata?: Record<string, unknown>;
}

/** 工具调用记录 */
export interface ToolCallRecord {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
}

// ========== 性能分析类型 ==========

/** 性能指标 */
export interface PerformanceMetrics {
  totalDuration: number;
  toolCallCount: number;
  averageToolCallDuration: number;
  slowToolCalls: ToolCallRecord[];
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  eventTimeline: {
    type: string;
    timestamp: number;
    duration?: number;
  }[];
}

/** 性能分析结果 */
export interface AnalysisResult {
  sessionId: string;
  metrics: PerformanceMetrics;
  bottlenecks: string[];
  suggestions: string[];
}

// ========== 配置类型 ==========

/** AgentScope 配置 */
export interface AgentScopeConfig {
  /** 存储路径 */
  storagePath?: string;
  /** Web 服务器端口 */
  port?: number;
  /** 是否启用实时监控 */
  realtime?: boolean;
  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** 最大保存会话数 */
  maxSessions?: number;
}
