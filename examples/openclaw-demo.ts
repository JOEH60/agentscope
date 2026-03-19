/**
 * 示例：使用 OpenClaw 适配器追踪 Agent
 */

import { createOpenClawAdapter } from '../src/index.js';

async function main() {
  const adapter = createOpenClawAdapter({ autoSave: true });

  // 开始追踪
  const session = adapter.startTracking({
    agentName: 'demo-agent',
    model: 'claude-3-5-sonnet',
    sessionName: '演示会话',
  });

  console.log(`✅ 会话已创建: ${session.id}`);

  // 模拟 Agent 运行
  adapter.recordUserMessage('帮我分析 sales.csv 文件');

  const thinkId = adapter.recordThinkingStart('需要先读取文件内容');
  await sleep(200);
  adapter.recordThinkingEnd('确定需要调用 read_file 工具', thinkId);

  const callId = adapter.recordToolCallStart('read_file', { path: 'sales.csv' });
  await sleep(500);
  adapter.recordToolCallEnd('read_file', { rows: 1024, columns: 8 }, callId);

  const thinkId2 = adapter.recordThinkingStart('数据包含销售记录，需要统计分析');
  await sleep(300);
  adapter.recordThinkingEnd('调用 analyze_data 工具', thinkId2);

  const callId2 = adapter.recordToolCallStart('analyze_data', { method: 'summary' });
  await sleep(1200); // 模拟慢调用
  adapter.recordToolCallEnd('analyze_data', { total: 98765, avg: 1234 }, callId2);

  adapter.recordTokenUsage(512, 256);
  adapter.recordAssistantMessage('分析完成！总销售额 98,765 元，平均每笔 1,234 元。', 256);

  // 结束追踪
  const finalSession = adapter.endTracking('completed');
  console.log(`✅ 会话已完成: 耗时 ${finalSession?.totalDuration}ms`);

  // 查看决策树
  const tree = adapter.getDecisionTree();
  console.log('\n决策树:');
  console.log(JSON.stringify(tree, null, 2));
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
