/**
 * AgentScope 事件系统
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { AgentEvent, EventType } from './types.js';

/** 事件发射器 */
export class EventEmitter extends EventEmitter {
  private static instance: EventEmitter;

  static getInstance(): EventEmitter {
    if (!EventEmitter.instance) {
      EventEmitter.instance = new EventEmitter();
    }
    return EventEmitter.instance;
  }
}

/** 事件总线 */
export class EventBus {
  private emitter: EventEmitter;
  private eventHistory: AgentEvent[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize = 10000) {
    this.emitter = EventEmitter.getInstance();
    this.maxHistorySize = maxHistorySize;
  }

  /** 发射事件 */
  emit(event: Omit<AgentEvent, 'id' | 'timestamp'> & { type: EventType }): AgentEvent {
    const fullEvent: AgentEvent = {
      ...event,
      id: uuidv4(),
      timestamp: Date.now(),
    } as AgentEvent;

    // 保存到历史
    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // 发射事件
    this.emitter.emit('event', fullEvent);
    this.emitter.emit(fullEvent.type, fullEvent);

    return fullEvent;
  }

  /** 监听所有事件 */
  onAll(callback: (event: AgentEvent) => void): void {
    this.emitter.on('event', callback);
  }

  /** 监听特定类型事件 */
  on<T extends AgentEvent>(
    eventType: T['type'],
    callback: (event: T) => void
  ): void {
    this.emitter.on(eventType, callback as (event: AgentEvent) => void);
  }

  /** 取消监听 */
  off(eventType: string, callback: (event: AgentEvent) => void): void {
    this.emitter.off(eventType, callback);
  }

  /** 获取历史事件 */
  getHistory(sessionId?: string): AgentEvent[] {
    if (sessionId) {
      return this.eventHistory.filter(e => e.sessionId === sessionId);
    }
    return [...this.eventHistory];
  }

  /** 清空历史 */
  clearHistory(): void {
    this.eventHistory = [];
  }
}

/** 全局事件总线实例 */
export const globalEventBus = new EventBus();
