# AgentScope 🔍

> AI Agent 的"X光机"——让 Agent 的每一步决策、每一次工具调用都清晰可见

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/yourname/agentscope.svg)](https://github.com/yourname/agentscope/stargazers)
[![npm version](https://img.shields.io/npm/v/agentscope.svg)](https://www.npmjs.com/package/agentscope)

---

## ✨ 功能特性

- 🔍 **决策树可视化** — 直观展示 Agent 的思考过程和决策路径
- 📊 **工具调用追踪** — 实时监控每一次工具调用，包括参数、返回值、耗时
- ⚡ **性能分析** — 识别性能瓶颈，优化 Agent 响应速度
- 🔌 **多框架支持** — 兼容 OpenClaw、LangChain、AutoGen 等主流框架
- 📝 **会话回放** — 保存并回放 Agent 运行历史
- 🎯 **断点调试** — 在关键节点暂停，检查状态

---

## 📸 截图预览

```
┌─────────────────────────────────────────────────────────────┐
│  AgentScope Dashboard                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🤖 Agent: Claude-3.5-Sonnet                                │
│  📊 Session: sess_abc123                                     │
│                                                              │
│  ┌─ Decision Tree ─────────────────────────────────────────┐│
│  │                                                          ││
│  │  🎯 User: "帮我分析这个CSV文件"                           ││
│  │     │                                                    ││
│  │     ├─ 🤔 思考: 需要先读取文件内容                        ││
│  │     │  └─ ⏱️ 0.2s                                        ││
│  │     │                                                    ││
│  │     ├─ 🔧 Tool: read_file                                ││
│  │     │  ├─ 参数: path="data.csv"                          ││
│  │     │  ├─ 返回: 1024 行数据                              ││
│  │     │  └─ ⏱️ 0.5s                                        ││
│  │     │                                                    ││
│  │     ├─ 🤔 思考: 数据包含销售记录，需要统计分析            ││
│  │     │  └─ ⏱️ 0.3s                                        ││
│  │     │                                                    ││
│  │     ├─ 🔧 Tool: analyze_data                             ││
│  │     │  ├─ 参数: method="summary"                         ││
│  │     │  ├─ 返回: 统计结果                                 ││
│  │     │  └─ ⏱️ 1.2s ⚠️ 慢                                  ││
│  │     │                                                    ││
│  │     └─ ✅ 完成: 已生成分析报告                            ││
│  │                                                          ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  📈 Performance: 总耗时 2.2s | Token: 1,234 | 工具调用: 2    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 快速开始

### 安装

```bash
# 使用 npm
npm install -g agentscope

# 或使用 yarn
yarn global add agentscope

# 或使用 pnpm
pnpm add -g agentscope
```

### 启动

```bash
# 启动 AgentScope 仪表板
agentscope start

# 指定端口
agentscope start --port 3000
```

### 与 OpenClaw 集成

```javascript
// 在你的 OpenClaw 配置中添加
{
  "plugins": {
    "agentscope": {
      "enabled": true,
      "endpoint": "http://localhost:3000"
    }
  }
}
```

### 与 LangChain 集成

```python
from agentscope import AgentScope
from langchain.agents import initialize_agent

# 初始化 AgentScope
scope = AgentScope(api_key="your-api-key")

# 包装你的 LangChain agent
agent = initialize_agent(tools, llm)
scope.wrap(agent)

# 现在所有 agent 调用都会被记录到 AgentScope
agent.run("你的任务")
```

---

## 📖 文档

- [快速开始指南](./docs/getting-started.md)
- [API 参考](./docs/api.md)
- [集成指南](./docs/integrations.md)
- [示例代码](./examples/)

---

## 🛠️ 技术栈

- **前端:** React + TypeScript + Tailwind CSS
- **后端:** Node.js + Express
- **可视化:** D3.js / React Flow
- **存储:** SQLite (本地) / PostgreSQL (生产)

---

## 🤝 贡献指南

欢迎所有形式的贡献！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

---

## 📝 开发路线

### v0.1.0 (当前)
- [x] 项目初始化
- [ ] 基础 UI 框架
- [ ] OpenClaw 日志解析
- [ ] 决策树可视化

### v0.2.0
- [ ] LangChain 集成
- [ ] 实时监控模式
- [ ] 性能分析面板

### v0.3.0
- [ ] AutoGen 集成
- [ ] 会话回放功能
- [ ] 团队协作功能

### v1.0.0
- [ ] 完整文档
- [ ] 单元测试覆盖
- [ ] 性能优化
- [ ] 正式发布

---

## 💬 社区

- [GitHub Discussions](https://github.com/yourname/agentscope/discussions) - 提问和分享想法
- [Discord](https://discord.gg/agentscope) - 实时交流
- [Twitter](https://twitter.com/agentscope) - 关注最新动态

---

## 📄 许可证

本项目基于 [MIT 许可证](./LICENSE) 开源。

---

## 🙏 致谢

感谢以下项目的启发：
- [OpenClaw](https://github.com/openclaw/openclaw) - 个人 AI 助手框架
- [LangChain](https://github.com/langchain-ai/langchain) - LLM 应用开发框架
- [superpowers](https://github.com/obra/superpowers) - Agentic skills 框架

---

<p align="center">
  由 ❤️ 和 ☕ 驱动 | AgentScope Team
</p>
