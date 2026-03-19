/**
 * AgentScope 追踪系统
 */

import { v4 as uuidv4 } from 'uuid';
import type { DecisionNode, ToolCallRecord, AgentEvent, EventType } from './types.js';
import { globalEventBus } from './event.js';

/** 追踪记录 */
export interface TraceRecord {
  sessionId: string;
  decisionTree: DecisionNode;
  toolCalls: ToolCallRecord[];
  startTime: number;
  endTime?: number;
}

/** 追踪管理器 */
export class TraceManager {
  private traces: Map<string, TraceRecord> = new Map();
  private currentTrace: TraceRecord | null = null;
  private nodeStack: DecisionNode[] = [];

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // 监听事件并构建决策树
    globalEventBus.onAll((event: AgentEvent) => {
      this.processEvent(event);
    });
  }

  private processEvent(event: AgentEvent): void {
    if (!this.currentTrace || event.sessionId !== this.currentTrace.sessionId) {
      return;
    }

    const node = this.eventToNode(event);

    switch (event.type) {
      case 'thinking_start':
      case 'tool_call_start':
        this.nodeStack.push(node);
        break;

      case 'thinking_end':
      case 'tool_call_end':
        if (this.nodeStack.length > 0) {
          const startNode = this.nodeStack.pop();
          if (startNode) {
            startNode.duration = (event.timestamp || Date.now()) - startNode.timestamp;
            // 更新内容
            if ('content' in event) {
              startNode.content = (event as any).content || startNode.content;
            }
            // 如果有结果，添加到 metadata
            if ('result' in event) {
              startNode.metadata = { ...startNode.metadata, result: (event as any).result };
            }
          }
        }
        break;
    }

    // 添加到决策树
    if (this.nodeStack.length === 0 && this.currentTrace.decisionTree.children) {
      this.currentTrace.decisionTree.children.push(node);
    } else if (this.nodeStack.length > 0) {
      const parent = this.nodeStack[this.nodeStack.length - 1];
      parent.children.push(node);
    }
  }

  private eventToNode(event: AgentEvent): DecisionNode {
    const nodeType = this.getEventType(event.type);

    let content = '';
    if ('content' in event) {
      content = String((event as any).content);
    } else if ('toolName' in event) {
      content = `Tool: ${(event as any).toolName}`;
    }

    return {
      id: event.id,
      type: nodeType,
      content,
      timestamp: event.timestamp,
      children: [],
      metadata: event.metadata,
    };
  }

  private getEventType(eventType: EventType | string): DecisionNode['type'] {
    if (eventType.toString().includes('thinking')) return 'thinking';
    if (eventType.toString().includes('tool')) return 'tool';
    if (eventType.toString().includes('message')) return 'message';
    return 'decision';
  }

  /** 开始追踪会话 */
  startTrace(sessionId: string): TraceRecord {
    const trace: TraceRecord = {
      sessionId,
      decisionTree: {
        id: uuidv4(),
        type: 'decision',
        content: 'Root',
        timestamp: Date.now(),
        children: [],
      },
      toolCalls: [],
      startTime: Date.now(),
    };

    this.traces.set(sessionId, trace);
    this.currentTrace = trace;
    this.nodeStack = [];

    return trace;
  }

  /** 结束追踪 */
  endTrace(sessionId: string): TraceRecord | undefined {
    const trace = this.traces.get(sessionId);
    if (trace) {
      trace.endTime = Date.now();
      if (this.currentTrace?.sessionId === sessionId) {
        this.currentTrace = null;
        this.nodeStack = [];
      }
    }
    return trace;
  }

  /** 获取追踪记录 */
  getTrace(sessionId: string): TraceRecord | undefined {
    return this.traces.get(sessionId);
  }

  /** 获取所有追踪 */
  getAllTraces(): TraceRecord[] {
    return Array.from(this.traces.values());
  }

  /** 获取决策树 */
  getDecisionTree(sessionId: string): DecisionNode | undefined {
    return this.traces.get(sessionId)?.decisionTree;
  }

  /** 添加工具调用记录 */
  addToolCall(sessionId: string, record: Omit<ToolCallRecord, 'id'>): ToolCallRecord {
    const trace = this.traces.get(sessionId);
    const fullRecord: ToolCallRecord = {
      ...record,
      id: uuidv4(),
    };

    if (trace) {
      trace.toolCalls.push(fullRecord);
    }

    return fullRecord;
  }

  /** 获取工具调用记录 */
  getToolCalls(sessionId: string): ToolCallRecord[] {
    return this.traces.get(sessionId)?.toolCalls || [];
  }

  /** 清空追踪 */
  clearTrace(sessionId: string): void {
    this.traces.delete(sessionId);
  }
}

/** 全局追踪管理器实例 */
export const globalTraceManager = new TraceManager();
