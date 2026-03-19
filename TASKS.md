# AgentScope 开发任务列表

## Phase 1: 项目初始化 ✅

- [x] 创建项目目录结构
- [x] 编写 README.md
- [x] 创建 package.json
- [x] 配置 TypeScript (tsconfig.json)
- [x] 配置构建工具 (tsup.config.ts)
- [x] 创建 .gitignore
- [x] 创建 LICENSE

## Phase 2: 核心代码 ✅

- [x] src/core/types.ts - 类型定义
- [x] src/core/event.ts - 事件系统
- [x] src/core/session.ts - 会话管理
- [x] src/core/trace.ts - 追踪系统
- [x] src/core/storage.ts - SQLite 数据存储
- [x] src/core/analyzer.ts - 性能分析
- [x] src/core/index.ts - 核心入口

## Phase 3: 适配器 ✅

- [x] src/adapters/index.ts - 适配器入口
- [x] src/adapters/openclaw/index.ts - OpenClaw 适配器
- [x] src/adapters/langchain/index.ts - LangChain 适配器

## Phase 4: CLI 工具 ✅

- [x] src/cli/index.ts - CLI 入口
- [x] src/cli/commands/start.ts - start 命令
- [x] src/cli/commands/view.ts - view 命令
- [x] src/cli/commands/export.ts - export 命令 (json/csv/html)

## Phase 5: Web UI ✅

- [x] src/web/server.ts - Express + WebSocket 服务器
- [x] src/web/static/index.html - 完整前端仪表板
  - 会话列表侧边栏
  - 概览 Tab（统计卡片 + 健康评分）
  - 决策树 Tab（可视化树形结构）
  - 工具调用 Tab（调用记录表格）
  - 事件日志 Tab（实时事件流）
  - 性能分析 Tab（瓶颈 + 建议）

## Phase 6: 文档与示例 ✅

- [x] docs/getting-started.md
- [x] examples/openclaw-demo.ts
- [x] src/index.ts - 主入口

---

## 下一步 (v0.2.0)

- [ ] 单元测试 (vitest)
- [ ] GitHub Actions CI/CD
- [ ] npm 发布
- [ ] AutoGen 适配器
- [ ] 实时 WebSocket 连接 OpenClaw Gateway
- [ ] 会话对比视图

---

当前进度: 🎉 v0.1.0 MVP 完成！
