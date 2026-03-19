# 快速开始

## 安装

```bash
npm install -g agentscope
```

## 启动仪表板

```bash
agentscope start
# 浏览器自动打开 http://localhost:3000
```

## 与 OpenClaw 集成

```typescript
import { createOpenClawAdapter } from 'agentscope';

const adapter = createOpenClawAdapter();

// 开始追踪
const session = adapter.startTracking({
  agentName: 'my-agent',
  model: 'claude-3-5-sonnet',
});

// 记录用户消息
adapter.recordUserMessage('帮我分析这个文件');

// 记录工具调用
const callId = adapter.recordToolCallStart('read_file', { path: 'data.csv' });
// ... 执行工具 ...
adapter.recordToolCallEnd('read_file', result, callId);

// 结束追踪
adapter.endTracking('completed');
```

## 与 LangChain 集成

```typescript
import { createLangChainAdapter } from 'agentscope';

const adapter = createLangChainAdapter();

// 包装你的 agent
const wrappedAgent = adapter.wrapAgent(myAgent, {
  agentName: 'langchain-agent',
  model: 'gpt-4',
});

// 正常使用，自动追踪
const result = await wrappedAgent.invoke('你的任务');
```

## CLI 命令

```bash
# 启动仪表板
agentscope start --port 3000

# 查看所有会话
agentscope view

# 查看单个会话
agentscope view <sessionId>

# 导出会话
agentscope export <sessionId> --format html --output report.html
```
