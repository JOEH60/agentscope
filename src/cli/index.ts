#!/usr/bin/env node
/**
 * AgentScope CLI 入口
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { startCommand } from './commands/start.js';
import { viewCommand } from './commands/view.js';
import { exportCommand } from './commands/export.js';

const program = new Command();

program
  .name('agentscope')
  .description(chalk.cyan('🔍 AgentScope - AI Agent 的"X光机"'))
  .version('0.1.0');

// start 命令
program
  .command('start')
  .description('启动 AgentScope 仪表板')
  .option('-p, --port <port>', '端口号', '3000')
  .option('--no-open', '不自动打开浏览器')
  .action(startCommand);

// view 命令
program
  .command('view [sessionId]')
  .description('查看会话详情')
  .option('-f, --format <format>', '输出格式 (table|json|tree)', 'table')
  .action(viewCommand);

// export 命令
program
  .command('export <sessionId>')
  .description('导出会话数据')
  .option('-o, --output <path>', '输出文件路径')
  .option('-f, --format <format>', '导出格式 (json|csv|html)', 'json')
  .action(exportCommand);

// 未知命令提示
program.on('command:*', () => {
  console.error(chalk.red(`\n未知命令: ${program.args.join(' ')}`));
  console.log(chalk.gray('运行 agentscope --help 查看帮助\n'));
  process.exit(1);
});

program.parse(process.argv);

// 无参数时显示帮助
if (!process.argv.slice(2).length) {
  console.log(chalk.cyan('\n🔍 AgentScope - AI Agent 的"X光机"\n'));
  program.outputHelp();
}
