/**
 * view 命令 - 查看会话详情
 */

import chalk from 'chalk';
import { globalStorage, globalAnalyzer } from '../../core/index.js';

export async function viewCommand(sessionId: string | undefined, options: { format: string }) {
  globalStorage.init();

  // 列出所有会话
  if (!sessionId) {
    const sessions = globalStorage.getAllSessions();

    if (!sessions.length) {
      console.log(chalk.yellow('\n暂无会话记录\n'));
      return;
    }

    console.log(chalk.cyan('\n📋 会话列表\n'));

    if (options.format === 'json') {
      console.log(JSON.stringify(sessions, null, 2));
      return;
    }

    // 表格输出
    const header = [
      chalk.bold('ID'.padEnd(10)),
      chalk.bold('名称'.padEnd(20)),
      chalk.bold('Agent'.padEnd(15)),
      chalk.bold('状态'.padEnd(12)),
      chalk.bold('Token'.padEnd(10)),
      chalk.bold('耗时'),
    ].join('  ');

    console.log(header);
    console.log(chalk.gray('─'.repeat(80)));

    for (const s of sessions) {
      const statusColor = s.status === 'completed' ? chalk.green : s.status === 'failed' ? chalk.red : chalk.blue;
      const row = [
        s.id.slice(0, 8).padEnd(10),
        (s.name || '-').slice(0, 18).padEnd(20),
        s.agentName.slice(0, 13).padEnd(15),
        statusColor(s.status.padEnd(12)),
        String(s.totalTokens).padEnd(10),
        s.totalDuration ? `${(s.totalDuration / 1000).toFixed(1)}s` : '-',
      ].join('  ');

      console.log(row);
    }

    console.log(chalk.gray(`\n共 ${sessions.length} 个会话\n`));
    return;
  }

  // 查看单个会话
  const session = globalStorage.getSession(sessionId);

  if (!session) {
    console.error(chalk.red(`\n会话不存在: ${sessionId}\n`));
    process.exit(1);
  }

  if (options.format === 'json') {
    const trace = globalStorage.getTrace(sessionId);
    const events = globalStorage.getEvents(sessionId);
    console.log(JSON.stringify({ session, trace, events }, null, 2));
    return;
  }

  // 详情输出
  console.log(chalk.cyan(`\n🔍 会话详情: ${session.name || session.id}\n`));

  console.log(chalk.bold('基本信息'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`  ID:       ${chalk.white(session.id)}`);
  console.log(`  Agent:    ${chalk.white(session.agentName)}`);
  console.log(`  模型:     ${chalk.white(session.model)}`);
  console.log(`  状态:     ${session.status === 'completed' ? chalk.green(session.status) : chalk.red(session.status)}`);
  console.log(`  开始:     ${chalk.white(new Date(session.startTime).toLocaleString())}`);
  if (session.endTime) {
    console.log(`  结束:     ${chalk.white(new Date(session.endTime).toLocaleString())}`);
  }
  console.log(`  耗时:     ${chalk.white(session.totalDuration ? `${(session.totalDuration / 1000).toFixed(1)}s` : '-')}`);
  console.log(`  Token:    ${chalk.white(session.totalTokens.toLocaleString())}`);
  console.log(`  事件数:   ${chalk.white(session.eventCount)}`);

  // 工具调用
  const trace = globalStorage.getTrace(sessionId);
  if (trace?.toolCalls.length) {
    console.log(chalk.bold('\n工具调用'));
    console.log(chalk.gray('─'.repeat(40)));
    for (const tc of trace.toolCalls) {
      const dur = tc.duration ? chalk.gray(` (${tc.duration}ms)`) : '';
      const status = tc.success ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} ${chalk.white(tc.toolName)}${dur}`);
    }
  }

  // 快速分析
  try {
    const quick = globalAnalyzer.quickAnalyze(sessionId);
    const scoreColor = quick.healthScore >= 80 ? chalk.green : quick.healthScore >= 50 ? chalk.yellow : chalk.red;

    console.log(chalk.bold('\n性能评分'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  健康分数: ${scoreColor(String(quick.healthScore) + '/100')}`);
  } catch {
    // 忽略分析错误
  }

  console.log();
}
