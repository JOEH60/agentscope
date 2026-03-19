/**
 * AgentScope 性能分析器
 */

import type {
  Session,
  AgentEvent,
  ToolCallRecord,
  PerformanceMetrics,
  AnalysisResult
} from './types.js';
import { globalStorage } from './storage.js';
import { globalTraceManager } from './trace.js';

/** 性能分析器 */
export class PerformanceAnalyzer {
  private slowThreshold: number; // 慢调用阈值（毫秒）

  constructor(slowThreshold = 1000) {
    this.slowThreshold = slowThreshold;
  }

  /** 分析会话性能 */
  analyze(sessionId: string): AnalysisResult {
    const session = globalStorage.getSession(sessionId);
    const events = globalStorage.getEvents(sessionId);
    const trace = globalStorage.getTrace(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const metrics = this.calculateMetrics(session, events, trace?.toolCalls || []);
    const bottlenecks = this.identifyBottlenecks(metrics);
    const suggestions = this.generateSuggestions(metrics, bottlenecks);

    const result: AnalysisResult = {
      sessionId,
      metrics,
      bottlenecks,
      suggestions,
    };

    // 保存分析结果
    globalStorage.saveAnalysis(result);

    return result;
  }

  /** 计算性能指标 */
  private calculateMetrics(
    session: Session,
    events: AgentEvent[],
    toolCalls: ToolCallRecord[]
  ): PerformanceMetrics {
    // Token 统计
    let inputTokens = 0;
    let outputTokens = 0;

    for (const event of events) {
      if ('input' in event && 'output' in event) {
        inputTokens += (event as any).input || 0;
        outputTokens += (event as any).output || 0;
      }
    }

    // 工具调用统计
    const completedToolCalls = toolCalls.filter(tc => tc.duration !== undefined);
    const avgDuration = completedToolCalls.length > 0
      ? completedToolCalls.reduce((sum, tc) => sum + (tc.duration || 0), 0) / completedToolCalls.length
      : 0;

    // 慢调用
    const slowToolCalls = toolCalls.filter(tc => (tc.duration || 0) > this.slowThreshold);

    // 事件时间线
    const eventTimeline = events.map(e => ({
      type: e.type,
      timestamp: e.timestamp,
      duration: 'duration' in e ? (e as any).duration : undefined,
    }));

    return {
      totalDuration: session.totalDuration,
      toolCallCount: toolCalls.length,
      averageToolCallDuration: avgDuration,
      slowToolCalls,
      tokenUsage: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      eventTimeline,
    };
  }

  /** 识别性能瓶颈 */
  private identifyBottlenecks(metrics: PerformanceMetrics): string[] {
    const bottlenecks: string[] = [];

    // 慢工具调用
    if (metrics.slowToolCalls.length > 0) {
      const toolNames = [...new Set(metrics.slowToolCalls.map(tc => tc.toolName))];
      bottlenecks.push(`慢工具调用: ${toolNames.join(', ')} (耗时 > ${this.slowThreshold}ms)`);
    }

    // 高 Token 消耗
    if (metrics.tokenUsage.total > 10000) {
      bottlenecks.push(`高 Token 消耗: ${metrics.tokenUsage.total} tokens`);
    }

    // 平均工具调用时间长
    if (metrics.averageToolCallDuration > 500) {
      bottlenecks.push(`平均工具调用时间过长: ${metrics.averageToolCallDuration.toFixed(0)}ms`);
    }

    // 工具调用次数多
    if (metrics.toolCallCount > 20) {
      bottlenecks.push(`工具调用次数过多: ${metrics.toolCallCount} 次`);
    }

    return bottlenecks;
  }

  /** 生成优化建议 */
  private generateSuggestions(metrics: PerformanceMetrics, bottlenecks: string[]): string[] {
    const suggestions: string[] = [];

    if (metrics.slowToolCalls.length > 0) {
      suggestions.push('💡 考虑优化慢工具调用，或使用异步方式处理');
    }

    if (metrics.tokenUsage.total > 10000) {
      suggestions.push('💡 尝试减少上下文长度，或使用更简洁的提示词');
    }

    if (metrics.toolCallCount > 20) {
      suggestions.push('💡 合并相似的工具调用，减少调用次数');
    }

    if (bottlenecks.length === 0) {
      suggestions.push('✅ 性能表现良好，无明显瓶颈');
    }

    return suggestions;
  }

  /** 快速分析 - 仅返回关键指标 */
  quickAnalyze(sessionId: string): {
    totalDuration: number;
    toolCallCount: number;
    tokenUsage: number;
    healthScore: number;
  } {
    const session = globalStorage.getSession(sessionId);
    const trace = globalStorage.getTrace(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const toolCalls = trace?.toolCalls || [];

    // 计算健康分数 (0-100)
    let healthScore = 100;

    // 扣分项
    if (toolCalls.length > 20) healthScore -= 10;
    if (session.totalTokens > 10000) healthScore -= 15;
    if (session.totalDuration > 60000) healthScore -= 10;

    const slowCalls = toolCalls.filter(tc => (tc.duration || 0) > this.slowThreshold);
    healthScore -= slowCalls.length * 5;

    // 确保分数在 0-100 范围内
    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      totalDuration: session.totalDuration,
      toolCallCount: toolCalls.length,
      tokenUsage: session.totalTokens,
      healthScore,
    };
  }

  /** 对比多个会话 */
  compare(sessionIds: string[]): {
    sessions: { id: string; name?: string; duration: number; tokens: number; toolCalls: number }[];
    best: string;
    worst: string;
  } {
    const sessions = sessionIds.map(id => {
      const session = globalStorage.getSession(id);
      const trace = globalStorage.getTrace(id);

      return {
        id,
        name: session?.name,
        duration: session?.totalDuration || 0,
        tokens: session?.totalTokens || 0,
        toolCalls: trace?.toolCalls.length || 0,
      };
    });

    // 找出最佳和最差
    const sorted = [...sessions].sort((a, b) => {
      // 综合评分：时间 + tokens + 工具调用次数
      const scoreA = a.duration + a.tokens * 10 + a.toolCalls * 100;
      const scoreB = b.duration + b.tokens * 10 + b.toolCalls * 100;
      return scoreA - scoreB;
    });

    return {
      sessions,
      best: sorted[0]?.id || '',
      worst: sorted[sorted.length - 1]?.id || '',
    };
  }
}

/** 全局分析器实例 */
export const globalAnalyzer = new PerformanceAnalyzer();
