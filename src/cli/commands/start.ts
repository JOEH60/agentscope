/**
 * start 命令 - 启动 AgentScope 仪表板
 */

import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { WebServer } from '../../web/server.js';
import { globalStorage } from '../../core/index.js';

export async function startCommand(options: { port: string; open: boolean }) {
  const port = parseInt(options.port, 10);

  console.log(chalk.cyan('\n🔍 AgentScope\n'));

  const spinner = ora('正在启动服务器...').start();

  try {
    // 初始化存储
    globalStorage.init();

    // 启动 Web 服务器
    const server = new WebServer(port);
    await server.start();

    spinner.succeed(chalk.green('服务器启动成功！'));

    const url = `http://localhost:${port}`;

    console.log(
      boxen(
        [
          chalk.bold('🔍 AgentScope 已启动'),
          '',
          `${chalk.gray('仪表板:')}  ${chalk.cyan(url)}`,
          `${chalk.gray('API:')}     ${chalk.cyan(`${url}/api`)}`,
          `${chalk.gray('WebSocket:')} ${chalk.cyan(`ws://localhost:${port}`)}`,
          '',
          chalk.gray('按 Ctrl+C 停止服务器'),
        ].join('\n'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      )
    );

    // 自动打开浏览器
    if (options.open !== false) {
      try {
        const { default: open } = await import('open').catch(() => ({ default: null }));
        if (open) await open(url);
      } catch {
        // 忽略打开浏览器失败
      }
    }

    // 优雅退出
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n\n正在停止服务器...'));
      await server.stop();
      globalStorage.close();
      console.log(chalk.green('服务器已停止。再见！👋\n'));
      process.exit(0);
    });

  } catch (err) {
    spinner.fail(chalk.red('启动失败'));
    console.error(chalk.red(String(err)));
    process.exit(1);
  }
}
