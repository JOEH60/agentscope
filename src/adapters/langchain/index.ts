/**
 * LangChain Adapter
 * 用于追踪 LangChain Agent 的运行
 */

import {
  globalEventBus,
  globalSessionManager,
  globalTraceManager,
  globalStorage,
  EventType,
  type Session,
} from '../../core/index.js';

/** LangChain 适配器配置 */
export interface LangChainAdapterConfig {
  /** 是否自动保存 */
  autoSave?: boolean;
  /** 会话名称 */
  sessionName?: string;
}

/** LangChain 适配器 */
export class LangChainAdapter {
  private config: LangChainAdapterConfig;
  private currentSession: Session | null = null;
  private toolCallMap: Map<string, { toolName: string; args: Record<string, unknown>; startTime: number }> = new Map();

  constructor(config: LangChainAdapterConfig = {}) {
    this.config = {
      autoSave: true,
      ...config,
    };

    // 初始化存储
    globalStorage.init();
  }

  /** 包装 LangChain Agent，自动追踪 */
  wrapAgent<T extends { invoke: (input: any) => Promise<any> }>(
    agent: T,
    options: {
      agentName: string;
      model: string;
      sessionName?: string;
    }
  ): T {
    const originalInvoke = agent.invoke.bind(agent);

    agent.invoke = async (input: any) => {
      // 开始追踪
      this.startTracking({
        agentName: options.agentName,
        model: options.model,
        sessionName: options.sessionName,
      });

      // 记录用户输入
      const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
      this.recordUserMessage(inputStr);

      try {
        // 执行原始 invoke
        const result = await originalInvoke(input);

        // 记录输出
        const outputStr = typeof result === 'string' ? result : JSON.stringify(result);
        this.recordAssistantMessage(outputStr);

        // 结束追踪
        this.endTracking('completed');

        return result;
      } catch (error) {
        // 记录错误
        this.recordError(error instanceof Error ? error.message : String(error));
        this.endTracking('failed');
        throw error;
      }
    };

    return agent;
  }

  /** 开始追踪 */
  startTracking(options: {
    agentName: string;
    model: string;
    sessionName?: string;
  }): Session {
    this.currentSession = globalSessionManager.createSession({
      agentName: options.agentName,
      model: options.model,
      name: options.sessionName || this.config.sessionName,
    });

    globalTraceManager.startTrace(this.currentSession.id);

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

  /** 记录 LLM 开始 */
  recordLLMStart(prompt: string): void {
    if (!this.currentSession) return;

    this.recordThinkingStart(`LLM 调用: ${prompt.slice(0, 100)}...`);
  }

  /** 记录 LLM 结束 */
  recordLLMEnd(output: string, tokens?: { input: number; output: number }): void {
    if (!this.currentSession) return;

    this.recordThinkingEnd(output);

    if (tokens) {
      this.recordTokenUsage(tokens.input, tokens.output);
    }
  }

  /** 记录工具调用开始 */
  recordToolStart(toolName: string, args: Record<string, unknown>): string {
    if (!this.currentSession) return '';

    const event = globalEventBus.emit({
      type: EventType.TOOL_CALL_START,
      sessionId: this.currentSession.id,
      toolName,
      args,
    });

    this.toolCallMap.set(event.id, {
      toolName,
      args,
      startTime: Date.now(),
    });

    globalTraceManager.addToolCall(this.currentSession.id, {
      toolName,
      args,
      startTime: Date.now(),
      success: false,
    });

    return event.id;
  }

  /** 记录工具调用结束 */
  recordToolEnd(toolName: string, output: string, startEventId: string): void {
    if (!this.currentSession) return;

    const toolInfo = this.toolCallMap.get(startEventId);

    globalEventBus.emit({
      type: EventType.TOOL_CALL_END,
      sessionId: this.currentSession.id,
      toolName,
      args: toolInfo?.args || {},
      result: output,
      parentId: startEventId,
    });

    this.toolCallMap.delete(startEventId);
  }

  /** 记录错误 */
  recordError(error: string): void {
    if (!this.currentSession) return;

    globalEventBus.emit({
      type: EventType.AGENT_ERROR,
      sessionId: this.currentSession.id,
      metadata: { error },
    });
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

    globalEventBus.emit({
      type: EventType.AGENT_END,
      sessionId: this.currentSession.id,
      metadata: { status },
    });

    globalSessionManager.updateStatus(
      this.currentSession.id,
      status === 'completed' ? 'completed' : 'failed'
    );

    globalTraceManager.endTrace(this.currentSession.id);

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
    this.toolCallMap.clear();

    return session;
  }

  /** 获取当前会话 */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }
}

/** 创建 LangChain 适配器实例 */
export function createLangChainAdapter(config?: LangChainAdapterConfig): LangChainAdapter {
  return new LangChainAdapter(config);
}

/**
 * Python 版 LangChain 集成示例 (参考)
 *
 * ```python
 * from agentscope import LangChainAdapter
 * from langchain.agents import initialize_agent, Tool
 * from langchain.llms import OpenAI
 *
 * # 创建适配器
 * adapter = LangChainAdapter()
 *
 * # 创建 LangChain agent
 * llm = OpenAI(temperature=0)
 * tools = [Tool(name="calc", func=lambda x: eval(x), description="calculator")]
 * agent = initialize_agent(tools, llm, agent="zero-shot-react-description")
 *
 * # 包装 agent
 * wrapped_agent = adapter.wrap_agent(agent, agent_name="my-agent", model="gpt-4")
 *
 * # 现在所有调用都会被追踪
 * result = wrapped_agent.invoke("what is 2 + 2?")
 * ```
 */
