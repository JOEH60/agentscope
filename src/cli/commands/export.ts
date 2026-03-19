/**
 * export 命令 - 导出会话数据
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { globalStorage } from '../../core/index.js';

export async function exportCommand(sessionId: string, options: { output?: string; format: string }) {
  globalStorage.init();

  const session = globalStorage.getSession(sessionId);
  if (!session) {
    console.error(chalk.red(`\n会话不存在: ${sessionId}\n`));
    process.exit(1);
  }

  const spinner = ora(`正在导出会话 ${sessionId.slice(0, 8)}...`).start();

  try {
    const trace = globalStorage.getTrace(sessionId);
    const events = globalStorage.getEvents(sessionId);
    const analysis = globalStorage.getAnalysis(sessionId);

    const outputPath = options.output || `agentscope-${sessionId.slice(0, 8)}.${options.format}`;

    switch (options.format) {
      case 'json':
        exportJSON({ session, trace, events, analysis }, outputPath);
        break;
      case 'csv':
        exportCSV(events, outputPath);
        break;
      case 'html':
        exportHTML({ session, trace, events, analysis }, outputPath);
        break;
      default:
        spinner.fail(chalk.red(`不支持的格式: ${options.format}`));
        process.exit(1);
    }

    spinner.succeed(chalk.green(`导出成功: ${chalk.cyan(outputPath)}`));
    console.log(chalk.gray(`  文件大小: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB\n`));

  } catch (err) {
    spinner.fail(chalk.red('导出失败'));
    console.error(chalk.red(String(err)));
    process.exit(1);
  }
}

function exportJSON(data: any, outputPath: string): void {
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
}

function exportCSV(events: any[], outputPath: string): void {
  const headers = ['id', 'type', 'timestamp', 'sessionId', 'content'];
  const rows = events.map(e => [
    e.id,
    e.type,
    new Date(e.timestamp).toISOString(),
    e.sessionId,
    JSON.stringify(e.content || e.toolName || '').replace(/,/g, ';'),
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  fs.writeFileSync(outputPath, csv, 'utf-8');
}

function exportHTML(data: any, outputPath: string): void {
  const { session, trace, events } = data;

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>AgentScope Report - ${session.name || session.id}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    h1 { color: #6366f1; }
    h2 { color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #f8fafc; padding: 10px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; }
    td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .completed { background: #dcfce7; color: #16a34a; }
    .failed { background: #fee2e2; color: #dc2626; }
    .running { background: #dbeafe; color: #2563eb; }
    pre { background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>🔍 AgentScope Report</h1>
  <p style="color:#64748b">生成时间: ${new Date().toLocaleString()}</p>

  <h2>会话信息</h2>
  <table>
    <tr><th>属性</th><th>值</th></tr>
    <tr><td>ID</td><td><code>${session.id}</code></td></tr>
    <tr><td>名称</td><td>${session.name || '-'}</td></tr>
    <tr><td>Agent</td><td>${session.agentName}</td></tr>
    <tr><td>模型</td><td>${session.model}</td></tr>
    <tr><td>状态</td><td><span class="badge ${session.status}">${session.status}</span></td></tr>
    <tr><td>总耗时</td><td>${session.totalDuration ? (session.totalDuration/1000).toFixed(1)+'s' : '-'}</td></tr>
    <tr><td>Token 消耗</td><td>${session.totalTokens.toLocaleString()}</td></tr>
  </table>

  ${trace?.toolCalls?.length ? `
  <h2>工具调用 (${trace.toolCalls.length})</h2>
  <table>
    <tr><th>工具</th><th>参数</th><th>耗时</th><th>状态</th></tr>
    ${trace.toolCalls.map((tc: any) => `
      <tr>
        <td><strong>${tc.toolName}</strong></td>
        <td><code>${JSON.stringify(tc.args).slice(0, 80)}</code></td>
        <td>${tc.duration ? tc.duration+'ms' : '-'}</td>
        <td><span class="badge ${tc.success ? 'completed' : 'failed'}">${tc.success ? '成功' : '失败'}</span></td>
      </tr>
    `).join('')}
  </table>` : ''}

  <h2>事件日志 (${events.length})</h2>
  <table>
    <tr><th>时间</th><th>类型</th><th>内容</th></tr>
    ${events.slice(0, 100).map((e: any) => `
      <tr>
        <td>${new Date(e.timestamp).toLocaleTimeString()}</td>
        <td><code>${e.type}</code></td>
        <td>${(e.content || e.toolName || '').toString().slice(0, 100)}</td>
      </tr>
    `).join('')}
  </table>
  ${events.length > 100 ? `<p style="color:#64748b">... 仅显示前 100 条，共 ${events.length} 条</p>` : ''}

  <p style="margin-top:40px;color:#94a3b8;font-size:12px;text-align:center">
    Generated by AgentScope v0.1.0
  </p>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf-8');
}
